import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import axios from "axios";

// REEMPLAZA ESTOS VALORES CON LOS DE TU PANEL DE META
const WHATSAPP_TOKEN = "EAAMXqaULMtABRF6oECq7Gxy0zCNKmTOscqNKrm9j3OmCTZBYBK7DCoBZChB4PAqFYgibVF9u8DnfWSY9g5s6sygZCZCCOvtOfM8q24kGckdkDzyf9a3XGySXYgGRZBbCYcwPyyLb29TNzdf4CU4FVflwGfJlXsquZCZBWc1UhAmvtSivkWuyFpG0oJb7K4lZCQZDZD";
const PHONE_NUMBER_ID = "977909532082603"; // El ID que sale en tu imagen
const VERSION = "v22.0";

export const whatsappWebhook = onRequest({ invoker: "public" }, async (req, res) => {
    // 1. VALIDACIÓN GET (Ya la tienes bien)
    if (req.method === "GET") {
        const verifyToken = "polla-club-secret-token";
        if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === verifyToken) {
            res.status(200).send(req.query["hub.challenge"]);
            return;
        }
        res.sendStatus(403);
        return;
    }

    // 2. PROCESAMIENTO DE MENSAJES (POST)
    if (req.method === "POST") {
        const body = req.body;
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from; // Teléfono del usuario
            const messageType = message.type;
            let userText = "";

            // Detectar si es texto o un botón
            if (messageType === "text") {
                userText = message.text.body.toLowerCase();
            } else if (messageType === "interactive") {
                userText = message.interactive.button_reply?.id || "";
            }

            // LÓGICA DE RESPUESTAS
            if (userText.includes("hola") || userText === "menu_principal") {
                await sendMenuPrincipal(from);
            } else if (userText === "ver_instrucciones" || userText.includes("instrucciones")) {
                await sendWhatsAppMessage(from, "¡Es muy fácil! ⚽\n\n1. Crea tu cuenta con tu correo.\n2. Adquiere tu plan preferido.\n3. ¡Invita a tus amigos con el link de la página y el código de tu grupo!");
            } else if (userText === "ver_planes" || userText.includes("planes")) {
                await sendWhatsAppMessage(from, "🏆 *Planes PollaClub* 🏆\n\n⚽️ Básico (hasta 5): $20.000\n⚽️ Amigos (hasta 15): $40.000\n⚽️ Pro (hasta 30): $60.000\n⚽️ Premium (hasta 50): $80.000\n\n¿Cuál se adapta mejor a tu parche?");
            } else if (userText === "ver_pagos" || userText.includes("pago")) {
                await sendWhatsAppMessage(from, "⚡ Para activar tu grupo, puedes realizar el pago por:\n\n🌀 *Bre-B:* 3013971483\n\nEnvía el comprobante por aquí para habilitarte de inmediato. 📩");
            } else {
                // Respuesta por defecto si no entiende
                await sendWhatsAppMessage(from, "No estoy seguro de cómo ayudarte con eso, pero puedes elegir una opción del menú escribiendo *Hola*.");
            }
        }

        res.status(200).send("EVENT_RECEIVED");
        return;
    }

    res.sendStatus(405);
});

// FUNCIÓN PARA ENVIAR TEXTO SIMPLE
async function sendWhatsAppMessage(to: string, text: string) {
    try {
        await axios.post(`https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`, {
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: { body: text }
        }, {
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
        });
    } catch (error) {
        logger.error("Error enviando mensaje", error);
    }
}

// FUNCIÓN PARA ENVIAR MENÚ CON BOTONES (Interactivo)
async function sendMenuPrincipal(to: string) {
    try {
        await axios.post(`https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`, {
            messaging_product: "whatsapp",
            to: to,
            type: "interactive",
            interactive: {
                type: "button",
                header: { type: "text", text: "¡Bienvenido a PollaClub! 🏟️" },
                body: { text: "Aquí demostramos quién sabe de verdad. ¿Qué quieres hacer hoy?" },
                footer: { text: "Selecciona una opción:" },
                action: {
                    buttons: [
                        { type: "reply", reply: { id: "ver_instrucciones", title: "Instrucciones ⚽" } },
                        { type: "reply", reply: { id: "ver_planes", title: "Ver Planes 🏆" } },
                        { type: "reply", reply: { id: "ver_pagos", title: "Formas de Pago ⚡" } }
                    ]
                }
            }
        }, {
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
        });
    } catch (error) {
        logger.error("Error enviando menú", error);
    }
}