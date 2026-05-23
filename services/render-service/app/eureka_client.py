"""
Registro manual en Eureka vía HTTP + heartbeat periódico.
Los browsers no pueden usar el cliente Java, así que se hace con httpx.
"""
import asyncio
import json
import logging
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

EUREKA_APP_NAME = "RENDER-SERVICE"
INSTANCE_ID = f"{settings.eureka_instance_hostname}:{settings.service_port}"

REGISTRATION_PAYLOAD = {
    "instance": {
        "instanceId": INSTANCE_ID,
        "app": EUREKA_APP_NAME,
        "ipAddr": settings.eureka_instance_hostname,
        "hostName": settings.eureka_instance_hostname,
        "status": "UP",
        "port": {"$": settings.service_port, "@enabled": "true"},
        "securePort": {"$": 443, "@enabled": "false"},
        "healthCheckUrl": f"http://{settings.eureka_instance_hostname}:{settings.service_port}/health",
        "statusPageUrl": f"http://{settings.eureka_instance_hostname}:{settings.service_port}/info",
        "homePageUrl": f"http://{settings.eureka_instance_hostname}:{settings.service_port}/",
        "vipAddress": "render-service",
        "dataCenterInfo": {
            "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
            "name": "MyOwn",
        },
        "leaseInfo": {
            "renewalIntervalInSecs": 30,
            "durationInSecs": 90,
        },
        "metadata": {"management.port": str(settings.service_port)},
    }
}


async def register_with_eureka() -> None:
    url = f"{settings.eureka_server_url}/apps/{EUREKA_APP_NAME}"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                url,
                content=json.dumps(REGISTRATION_PAYLOAD),
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code in (200, 204):
                logger.info("Registrado en Eureka como %s", INSTANCE_ID)
            else:
                logger.warning("Registro Eureka respondió %s", resp.status_code)
        except Exception as exc:
            logger.error("Error registrando en Eureka: %s", exc)


async def send_heartbeat() -> None:
    url = (
        f"{settings.eureka_server_url}/apps/{EUREKA_APP_NAME}/{INSTANCE_ID}"
    )
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            await client.put(url)
        except Exception as exc:
            logger.debug("Heartbeat Eureka fallido: %s", exc)


async def heartbeat_loop() -> None:
    """Tarea de fondo que envía heartbeat cada 30 segundos."""
    while True:
        await asyncio.sleep(30)
        await send_heartbeat()


async def deregister_from_eureka() -> None:
    url = (
        f"{settings.eureka_server_url}/apps/{EUREKA_APP_NAME}/{INSTANCE_ID}"
    )
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            await client.delete(url)
            logger.info("Desregistrado de Eureka")
        except Exception as exc:
            logger.error("Error al desregistrar de Eureka: %s", exc)
