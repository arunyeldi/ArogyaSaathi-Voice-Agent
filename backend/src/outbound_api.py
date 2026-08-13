"""ArogyaSaathi Outbound Call REST API Server.

Provides endpoints to trigger outbound phone calls, query call status, and manage opt-outs.
"""

import logging

from aiohttp import web
from dotenv import load_dotenv

from memory.service import MemoryService
from telephony.service import OutboundTelephonyService

logger = logging.getLogger("arogya_outbound_api")
load_dotenv(".env.local")

MemoryService.initialize()


async def handle_outbound_call(request: web.Request) -> web.Response:
    """POST /api/outbound-call -> Trigger a proactive outbound call."""
    try:
        data = await request.json()
        phone_number = data.get("phone_number", "")
        purpose = data.get("purpose", "vaccination_reminder")
        caller_name = data.get("caller_name")

        result = OutboundTelephonyService.initiate_outbound_call(
            phone_number=phone_number,
            purpose=purpose,
            caller_name=caller_name,
        )

        status_code = 200 if result.get("success") else 400
        return web.json_response(result, status=status_code)
    except Exception as e:
        logger.error(f"[API_ERROR] Failed to handle outbound call request: {e}")
        return web.json_response(
            {"success": False, "status": "failed", "message": str(e)},
            status=500,
        )


async def handle_call_status(request: web.Request) -> web.Response:
    """GET /api/outbound-status/{call_id} -> Query outbound call details."""
    call_id = request.match_info.get("call_id", "")
    info = MemoryService.get_call_info(call_id)
    if not info:
        return web.json_response(
            {"success": False, "message": "Call ID not found."}, status=404
        )
    return web.json_response({"success": True, "call": info})


async def handle_opt_out(request: web.Request) -> web.Response:
    """POST /api/outbound-opt-out -> Register a phone opt-out."""
    try:
        data = await request.json()
        phone_number = data.get("phone_number", "")
        if not phone_number:
            return web.json_response(
                {"success": False, "message": "Phone number required."}, status=400
            )

        success = OutboundTelephonyService.record_opt_out(phone_number)
        return web.json_response(
            {
                "success": success,
                "message": f"Phone number '{phone_number}' has been opted out of reminder calls.",
            }
        )
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)}, status=500)


async def handle_end_call(request: web.Request) -> web.Response:
    """POST /api/outbound-end -> Force end an active outbound call."""
    try:
        data = await request.json()
        call_id = data.get("call_id", "")
        if not call_id:
            return web.json_response(
                {"success": False, "message": "call_id parameter is required."},
                status=400,
            )
        result = await OutboundTelephonyService.end_outbound_call(call_id)
        return web.json_response(result)
    except Exception as e:
        logger.error(f"[API_ERROR] Failed to end outbound call: {e}")
        return web.json_response({"success": False, "message": str(e)}, status=500)


async def handle_list_escalations(request: web.Request) -> web.Response:
    """GET /api/escalations -> List all human escalation tickets."""
    status_filter = request.query.get("status")
    records = MemoryService.list_escalations(status_filter=status_filter)
    return web.json_response({"success": True, "escalations": records})


async def handle_get_escalation(request: web.Request) -> web.Response:
    """GET /api/escalations/{ref_id} -> Retrieve single escalation detail."""
    ref_id = request.match_info.get("ref_id", "")
    ticket = MemoryService.get_escalation(ref_id)
    if not ticket:
        return web.json_response(
            {"success": False, "message": f"Escalation '{ref_id}' not found."},
            status=404,
        )
    return web.json_response({"success": True, "escalation": ticket})


async def handle_update_escalation_status(request: web.Request) -> web.Response:
    """POST /api/escalations/{ref_id}/status -> Update ticket status (open, in_progress, resolved)."""
    try:
        ref_id = request.match_info.get("ref_id", "")
        data = await request.json()
        new_status = data.get("status", "")
        if not new_status:
            return web.json_response(
                {"success": False, "message": "status parameter is required."},
                status=400,
            )

        updated = MemoryService.update_escalation_status(ref_id, new_status)
        if not updated:
            return web.json_response(
                {"success": False, "message": f"Escalation '{ref_id}' not found."},
                status=404,
            )

        ticket = MemoryService.get_escalation(ref_id)
        return web.json_response(
            {
                "success": True,
                "message": f"Status for '{ref_id}' updated to '{new_status}'.",
                "escalation": ticket,
            }
        )
    except Exception as e:
        logger.error(f"[API_ERROR] Failed to update escalation status: {e}")
        return web.json_response({"success": False, "message": str(e)}, status=500)


async def handle_escalation_callback(request: web.Request) -> web.Response:
    """POST /api/escalations/{ref_id}/callback -> Trigger resolution callback via Day 6 outbound engine."""
    try:
        ref_id = request.match_info.get("ref_id", "")
        ticket = MemoryService.get_escalation(ref_id)
        if not ticket:
            return web.json_response(
                {"success": False, "message": f"Escalation '{ref_id}' not found."},
                status=404,
            )

        phone = ticket.get("phone_number", "").strip()
        caller_name = ticket.get("caller_name", "Valued Patient")

        if not phone:
            return web.json_response(
                {
                    "success": False,
                    "message": "No phone number registered for this escalation request.",
                },
                status=400,
            )

        # Check Day 6 Opt-Out status first!
        if MemoryService.is_phone_opted_out(phone):
            logger.warning(
                f"[CALLBACK_BLOCKED] Phone '{phone}' has opted out of outbound calls."
            )
            return web.json_response(
                {
                    "success": False,
                    "status": "opted_out",
                    "message": f"Callback blocked: Phone '{phone}' has registered opt-out preference.",
                },
                status=403,
            )

        call_result = OutboundTelephonyService.initiate_outbound_call(
            phone_number=phone,
            purpose="resolution_followup",
            caller_name=caller_name,
        )

        return web.json_response(
            {
                "success": True,
                "message": f"Resolution callback dispatched to '{phone}' for ticket {ref_id}.",
                "call_details": call_result,
            }
        )
    except Exception as e:
        logger.error(f"[API_ERROR] Failed to trigger escalation callback: {e}")
        return web.json_response({"success": False, "message": str(e)}, status=500)


async def handle_analytics_summary(request: web.Request) -> web.Response:
    """GET /api/analytics/summary -> Aggregate stats for Day 8 Call Analytics Dashboard."""
    try:
        summary = MemoryService.get_call_analytics_summary()
        return web.json_response({"success": True, "summary": summary})
    except Exception as e:
        logger.error(f"[API_ERROR] Failed to get analytics summary: {e}")
        return web.json_response({"success": False, "message": str(e)}, status=500)


async def handle_analytics_calls(request: web.Request) -> web.Response:
    """GET /api/analytics/calls -> List recent calls with optional channel & outcome filters."""
    try:
        channel = request.query.get("channel")
        outcome = request.query.get("outcome")
        limit_str = request.query.get("limit", "20")
        limit = int(limit_str) if limit_str.isdigit() else 20

        records = MemoryService.list_recent_calls(
            limit=limit, channel=channel, outcome=outcome
        )
        return web.json_response({"success": True, "calls": records})
    except Exception as e:
        logger.error(f"[API_ERROR] Failed to list analytics calls: {e}")
        return web.json_response({"success": False, "message": str(e)}, status=500)


async def handle_record_analytics(request: web.Request) -> web.Response:
    """POST /api/analytics/record -> Record or update a call analytics entry."""
    try:
        data = await request.json()
        success = MemoryService.record_call_analytics(data)
        return web.json_response(
            {"success": success, "message": "Call analytics recorded successfully."}
        )
    except Exception as e:
        logger.error(f"[API_ERROR] Failed to record call analytics: {e}")
        return web.json_response({"success": False, "message": str(e)}, status=500)


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_post("/api/outbound-call", handle_outbound_call)
    app.router.add_get("/api/outbound-status/{call_id}", handle_call_status)
    app.router.add_post("/api/outbound-opt-out", handle_opt_out)
    app.router.add_post("/api/outbound-end", handle_end_call)

    # Day 7 Human Escalation Routes
    app.router.add_get("/api/escalations", handle_list_escalations)
    app.router.add_get("/api/escalations/{ref_id}", handle_get_escalation)
    app.router.add_post(
        "/api/escalations/{ref_id}/status", handle_update_escalation_status
    )
    app.router.add_post(
        "/api/escalations/{ref_id}/callback", handle_escalation_callback
    )

    # Day 8 Call Analytics Routes
    app.router.add_get("/api/analytics/summary", handle_analytics_summary)
    app.router.add_get("/api/analytics/calls", handle_analytics_calls)
    app.router.add_post("/api/analytics/record", handle_record_analytics)
    return app


if __name__ == "__main__":
    app = create_app()
    web.run_app(app, host="127.0.0.1", port=8088)
