import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

let CLICKHOUSE_HOST = Deno.env.get("CLICKHOUSE_HOST") || "";
// Ensure host has a protocol; default ClickHouse HTTP port is 8123
if (CLICKHOUSE_HOST && !CLICKHOUSE_HOST.startsWith("http")) {
  CLICKHOUSE_HOST = "http://" + CLICKHOUSE_HOST;
}
// Ensure host has a port
if (CLICKHOUSE_HOST && !/:\d+$/.test(new URL(CLICKHOUSE_HOST).host)) {
  CLICKHOUSE_HOST = CLICKHOUSE_HOST + ":8123";
}
const CLICKHOUSE_USER = Deno.env.get("CLICKHOUSE_USER");
const CLICKHOUSE_PASSWORD = Deno.env.get("CLICKHOUSE_PASSWORD");

function sanitizeTs(ts) {
  if (!ts) return ts;
  return String(ts).replace('T', ' ').replace('Z', '').split('+')[0];
}

async function runQuery(sql, params = {}) {
  const startTime = Date.now();
  
  // Replace named params with values
  let finalSql = sql;
  for (const [key, value] of Object.entries(params)) {
    // Use proper escaping
    finalSql = finalSql.replaceAll(`{${key}:String}`, `'${String(value).replace(/'/g, "\\'")}'`);
    finalSql = finalSql.replaceAll(`{${key}:Int64}`, String(parseInt(value) || 0));
    finalSql = finalSql.replaceAll(`{${key}:Float64}`, String(parseFloat(value) || 0));
    finalSql = finalSql.replaceAll(`{${key}:DateTime64}`, `'${String(value).replace(/'/g, "\\'")}'`);
  }

  const url = new URL("/", CLICKHOUSE_HOST);
  url.searchParams.set("output_format_json_quote_64bit_integers", "0");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "X-ClickHouse-User": CLICKHOUSE_USER,
      "X-ClickHouse-Key": CLICKHOUSE_PASSWORD,
      "Content-Type": "text/plain",
    },
    body: finalSql,
  });

  const queryDuration = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ClickHouse error: ${errorText}`);
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { data: [], rows: 0, rows_before_limit_at_least: 0 };
  }

  return { ...data, queryDuration };
}

async function validateToken(base44, token) {
  if (!token) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const tokenHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  const sessions = await base44.asServiceRole.entities.Session.filter({ session_token_hash: tokenHash });
  const session = sessions[0];
  if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) return null;
  const users = await base44.asServiceRole.entities.AppUser.filter({ id: session.user_id });
  const user = users[0];
  if (!user || !user.is_active) return null;
  return user;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { type, params = {}, token } = body;

    // Health check ping - no auth required
    if (type === "ping") {
      const result = await runQuery("SELECT 1 AS ok FORMAT JSON");
      return Response.json({ ok: true, clickhouse: result.data?.[0] });
    }

    const user = await validateToken(base44, token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let sql = "";

    switch (type) {
      case "logsVolume": {
        const { from: _from, to: _to, service, level, interval = "5 MINUTE" } = params;
            const from = sanitizeTs(_from), to = sanitizeTs(_to);
            const conditions = [`ts >= toDateTime64('${from}', 3) AND ts <= toDateTime64('${to}', 3)`];
        if (service) conditions.push(`service IN (${service.map(s => `'${s}'`).join(",")})`);
        if (level) conditions.push(`level IN (${level.map(l => `'${l}'`).join(",")})`);
        sql = `
          SELECT toStartOfInterval(ts, INTERVAL ${interval}) AS bucket, level, count() AS cnt
          FROM observability.logs
          WHERE ${conditions.join(" AND ")}
          GROUP BY bucket, level
          ORDER BY bucket ASC
          FORMAT JSON
        `;
        break;
      }

      case "tracesVolume": {
        const { from: _from2, to: _to2, service, interval = "5 MINUTE" } = params;
        const from = sanitizeTs(_from2), to = sanitizeTs(_to2);
        const conditions = [`Timestamp >= toDateTime64('${from}', 9) AND Timestamp <= toDateTime64('${to}', 9)`];
        if (service) conditions.push(`ServiceName IN (${service.map(s => `'${s}'`).join(",")})`);
        sql = `
          SELECT toStartOfInterval(Timestamp, INTERVAL ${interval}) AS bucket, ServiceName, count() AS cnt
          FROM observability.traces
          WHERE ${conditions.join(" AND ")}
          GROUP BY bucket, ServiceName
          ORDER BY bucket ASC
          FORMAT JSON
        `;
        break;
      }

      case "errorRateByService": {
        const { from: _fERS, to: _tERS } = params;
        const from = sanitizeTs(_fERS), to = sanitizeTs(_tERS);
        sql = `
          SELECT ServiceName, 
            countIf(StatusCode = 'STATUS_CODE_ERROR') AS errors,
            count() AS total,
            round(countIf(StatusCode = 'STATUS_CODE_ERROR') / count() * 100, 2) AS error_rate
          FROM observability.traces
          WHERE Timestamp >= toDateTime64('${from}', 9) AND Timestamp <= toDateTime64('${to}', 9)
          GROUP BY ServiceName
          ORDER BY error_rate DESC
          LIMIT 20
          FORMAT JSON
        `;
        break;
      }

      case "latencyPercentiles": {
        const { from: _fLP, to: _tLP, service } = params;
        const from = sanitizeTs(_fLP), to = sanitizeTs(_tLP);
        const conditions = [`Timestamp >= toDateTime64('${from}', 9) AND Timestamp <= toDateTime64('${to}', 9)`];
        if (service) conditions.push(`ServiceName IN (${service.map(s => `'${s}'`).join(",")})`);
        sql = `
          SELECT ServiceName,
            quantile(0.50)(Duration / 1000000) AS p50_ms,
            quantile(0.95)(Duration / 1000000) AS p95_ms,
            quantile(0.99)(Duration / 1000000) AS p99_ms,
            count() AS cnt
          FROM observability.traces
          WHERE ${conditions.join(" AND ")}
          GROUP BY ServiceName
          ORDER BY p99_ms DESC
          LIMIT 20
          FORMAT JSON
        `;
        break;
      }

      case "logsList": {
        const { from: _fLL, to: _tLL, service, level, trace_id, span_id, round_id, container_name, target, image, search, cursor, limit = 50, excludeFilters = {} } = params;
        const from = sanitizeTs(_fLL), to = sanitizeTs(_tLL);
        const conditions = [`ts >= toDateTime64('${from}', 3) AND ts <= toDateTime64('${to}', 3)`];
        if (service?.length) conditions.push(`service ${excludeFilters.service ? 'NOT ' : ''}IN (${service.map(s => `'${s}'`).join(",")})`);
        if (level?.length) conditions.push(`level ${excludeFilters.level ? 'NOT ' : ''}IN (${level.map(l => `'${l}'`).join(",")})`);
        if (trace_id) conditions.push(`trace_id = '${trace_id}'`);
        if (span_id) conditions.push(`span_id = '${span_id}'`);
        if (round_id != null) conditions.push(`round_id = ${parseInt(round_id)}`);
        if (container_name?.length) conditions.push(`container_name IN (${container_name.map(c => `'${c}'`).join(",")})`);
        if (target?.length) conditions.push(`target IN (${target.map(t => `'${t}'`).join(",")})`);
        if (image?.length) conditions.push(`image IN (${image.map(i => `'${i}'`).join(",")})`);
        if (search) conditions.push(`toString(event_json) ILIKE '%${search.replace(/'/g, "\\'")}%'`);
        if (cursor) {
          const [curTs, curTraceId, curSpanId] = cursor;
          conditions.push(`(ts, trace_id, span_id) < (toDateTime64('${curTs}', 3), '${curTraceId}', '${curSpanId}')`);
        }
        sql = `
          SELECT ts, service, level, trace_id, span_id, round_id, container_id, container_name, target, image, event_json
          FROM observability.logs
          WHERE ${conditions.join(" AND ")}
          ORDER BY ts DESC, trace_id DESC, span_id DESC
          LIMIT ${Math.min(parseInt(limit), 200)}
          FORMAT JSON
        `;
        break;
      }

      case "tracesList": {
        const { from: _fTL, to: _tTL, service, trace_id, span_id, round_id, operator_name, status_code, span_kind, span_name, status_message, duration_min, duration_max, cursor, limit = 50 } = params;
        const from = sanitizeTs(_fTL), to = sanitizeTs(_tTL);
        const conditions = [`Timestamp >= toDateTime64('${from}', 9) AND Timestamp <= toDateTime64('${to}', 9)`];
        if (service?.length) conditions.push(`ServiceName IN (${service.map(s => `'${s}'`).join(",")})`);
        if (trace_id) conditions.push(`TraceId = '${trace_id}'`);
        if (span_id) conditions.push(`SpanId = '${span_id}'`);
        if (round_id != null) conditions.push(`round_id = ${parseInt(round_id)}`);
        if (operator_name) conditions.push(`operator_name ILIKE '%${operator_name.replace(/'/g, "\\'")}%'`);
        if (status_code?.length) conditions.push(`StatusCode IN (${status_code.map(s => `'${s}'`).join(",")})`);
        if (span_kind?.length) conditions.push(`SpanKind IN (${span_kind.map(s => `'${s}'`).join(",")})`);
        if (span_name) conditions.push(`SpanName ILIKE '%${span_name.replace(/'/g, "\\'")}%'`);
        if (status_message) conditions.push(`StatusMessage ILIKE '%${status_message.replace(/'/g, "\\'")}%'`);
        if (duration_min != null) conditions.push(`Duration >= ${parseInt(duration_min) * 1000000}`);
        if (duration_max != null) conditions.push(`Duration <= ${parseInt(duration_max) * 1000000}`);
        if (cursor) {
          const [curTs, curTraceId, curSpanId] = cursor;
          conditions.push(`(Timestamp, TraceId, SpanId) < (toDateTime64('${curTs}', 9), '${curTraceId}', '${curSpanId}')`);
        }
        sql = `
          SELECT Timestamp, TraceId, SpanId, ParentSpanId, SpanName, SpanKind,
                 ServiceName, Duration, StatusCode, StatusMessage,
                 round_id, operator_name, ResourceAttributes, SpanAttributes
          FROM observability.traces
          WHERE ${conditions.join(" AND ")}
          ORDER BY Timestamp DESC, TraceId DESC, SpanId DESC
          LIMIT ${Math.min(parseInt(limit), 200)}
          FORMAT JSON
        `;
        break;
      }

      case "traceDetail": {
        const { trace_id, from, to } = params;
        sql = `
          SELECT Timestamp, TraceId, SpanId, ParentSpanId, TraceState,
                 SpanName, SpanKind, ServiceName,
                 ResourceAttributes, ScopeName, ScopeVersion, ScopeAttributes, SpanAttributes,
                 Duration, StatusCode, StatusMessage,
                 Events.Timestamp AS EventTimestamps, Events.Name AS EventNames, Events.Attributes AS EventAttributes,
                 Links.TraceId AS LinkTraceIds, Links.SpanId AS LinkSpanIds,
                 round_id, operator_name
          FROM observability.traces
          WHERE TraceId = '${trace_id}'
          ${from && to ? `AND Timestamp >= toDateTime64('${from}', 9) AND Timestamp <= toDateTime64('${to}', 9)` : ''}
          ORDER BY Timestamp ASC
          FORMAT JSON
        `;
        break;
      }

      case "correlatedLogs": {
        const { trace_id, round_id, from, to, limit = 50 } = params;
        const conditions = [`ts >= toDateTime64('${from}', 3) AND ts <= toDateTime64('${to}', 3)`];
        const orConditions = [];
        if (trace_id) orConditions.push(`trace_id = '${trace_id}'`);
        if (round_id != null) orConditions.push(`round_id = ${parseInt(round_id)}`);
        if (orConditions.length) conditions.push(`(${orConditions.join(" OR ")})`);
        sql = `
          SELECT ts, service, level, trace_id, span_id, round_id, container_name, target, event_json
          FROM observability.logs
          WHERE ${conditions.join(" AND ")}
          ORDER BY ts ASC
          LIMIT ${Math.min(parseInt(limit), 200)}
          FORMAT JSON
        `;
        break;
      }

      case "filterOptions": {
        const { field, table, from, to } = params;
        const tableMap = { logs: "observability.logs", traces: "observability.traces" };
        const timeField = table === "traces" ? "Timestamp" : "ts";
        const precision = table === "traces" ? 9 : 3;
        const tbl = tableMap[table] || "observability.logs";
        sql = `
          SELECT DISTINCT ${field} AS val
          FROM ${tbl}
          WHERE ${timeField} >= toDateTime64('${from}', ${precision}) AND ${timeField} <= toDateTime64('${to}', ${precision})
            AND ${field} != ''
          ORDER BY val
          LIMIT 200
          FORMAT JSON
        `;
        break;
      }

      case "logsCount": {
        const { from, to, service, level, trace_id, span_id, round_id, container_name, target, image, search } = params;
        const conditions = [`ts >= toDateTime64('${from}', 3) AND ts <= toDateTime64('${to}', 3)`];
        if (service?.length) conditions.push(`service IN (${service.map(s => `'${s}'`).join(",")})`);
        if (level?.length) conditions.push(`level IN (${level.map(l => `'${l}'`).join(",")})`);
        if (trace_id) conditions.push(`trace_id = '${trace_id}'`);
        if (span_id) conditions.push(`span_id = '${span_id}'`);
        if (round_id != null) conditions.push(`round_id = ${parseInt(round_id)}`);
        if (container_name?.length) conditions.push(`container_name IN (${container_name.map(c => `'${c}'`).join(",")})`);
        if (target?.length) conditions.push(`target IN (${target.map(t => `'${t}'`).join(",")})`);
        if (image?.length) conditions.push(`image IN (${image.map(i => `'${i}'`).join(",")})`);
        if (search) conditions.push(`toString(event_json) ILIKE '%${search.replace(/'/g, "\\'")}%'`);
        sql = `
          SELECT count() AS cnt FROM observability.logs
          WHERE ${conditions.join(" AND ")}
          FORMAT JSON
        `;
        break;
      }

      case "tracesCount": {
        const { from, to, service, trace_id, span_id, round_id, operator_name, status_code, span_kind, span_name, duration_min, duration_max } = params;
        const conditions = [`Timestamp >= toDateTime64('${from}', 9) AND Timestamp <= toDateTime64('${to}', 9)`];
        if (service?.length) conditions.push(`ServiceName IN (${service.map(s => `'${s}'`).join(",")})`);
        if (trace_id) conditions.push(`TraceId = '${trace_id}'`);
        if (span_id) conditions.push(`SpanId = '${span_id}'`);
        if (round_id != null) conditions.push(`round_id = ${parseInt(round_id)}`);
        if (operator_name) conditions.push(`operator_name ILIKE '%${operator_name.replace(/'/g, "\\'")}%'`);
        if (status_code?.length) conditions.push(`StatusCode IN (${status_code.map(s => `'${s}'`).join(",")})`);
        if (span_kind?.length) conditions.push(`SpanKind IN (${span_kind.map(s => `'${s}'`).join(",")})`);
        if (span_name) conditions.push(`SpanName ILIKE '%${span_name.replace(/'/g, "\\'")}%'`);
        if (duration_min != null) conditions.push(`Duration >= ${parseInt(duration_min) * 1000000}`);
        if (duration_max != null) conditions.push(`Duration <= ${parseInt(duration_max) * 1000000}`);
        sql = `
          SELECT count() AS cnt FROM observability.traces
          WHERE ${conditions.join(" AND ")}
          FORMAT JSON
        `;
        break;
      }

      case "anomalyDetection": {
        const { from, to } = params;
        sql = `
          SELECT 
            toStartOfInterval(ts, INTERVAL 5 MINUTE) AS bucket,
            countIf(level = 'error') AS error_count,
            count() AS total_count
          FROM observability.logs
          WHERE ts >= toDateTime64('${from}', 3) AND ts <= toDateTime64('${to}', 3)
          GROUP BY bucket
          ORDER BY bucket ASC
          FORMAT JSON
        `;
        break;
      }

      default:
        return Response.json({ error: "Unknown query type" }, { status: 400 });
    }

    const result = await runQuery(sql);
    return Response.json({ 
      data: result.data || [], 
      rows: result.rows || 0,
      rows_before_limit_at_least: result.rows_before_limit_at_least || 0,
      queryDuration: result.queryDuration,
      sql: sql.trim()
    });

  } catch (error) {
    console.error("ClickHouse query error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});