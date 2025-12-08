import { GoogleGenerativeAI } from "@google/generative-ai";

export async function handleProcessMeetingAI(allUsers) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
        alert("API Key de Gemini no configurada. Por favor revisa tu archivo .env");
        return;
    }

    const notes = document.getElementById('meeting-notes-text').value;
    if (!notes) {
        alert('Por favor, pega las notas de la reunión en el área de texto.');
        return;
    }
    const loader = document.getElementById('ai-loader');
    if (loader) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Safely map user names
        const userNames = allUsers ? Object.values(allUsers).map(user => user.name).join(", ") : "";
        
        const prompt = `Analiza las siguientes notas de una reunión. Tu tarea es extraer dos cosas y devolverlas en formato JSON: 1. Un resumen ejecutivo ("summary") que destaque los puntos clave y compromisos. 2. Una lista de los nombres de los participantes ("participants") mencionados en el texto que también están en esta lista de usuarios del sistema: [${userNames}]. Notas: --- ${notes} --- Responde únicamente con un objeto JSON válido.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Sanitize JSON output
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiResult = JSON.parse(cleanedText);
        
        if (!aiResult.summary || !aiResult.participants) throw new Error("La IA no devolvió el formato esperado.");

        const summaryEl = document.getElementById('meeting-summary');
        if (summaryEl) summaryEl.value = aiResult.summary;
        
        document.querySelectorAll('.participant-checkbox').forEach(cb => cb.checked = false);
        
        if (allUsers) {
            aiResult.participants.forEach(nameFromAI => {
                const foundEntry = Object.entries(allUsers).find(([id, user]) => user.name.toLowerCase().includes(nameFromAI.toLowerCase()));
                if (foundEntry) {
                    const checkbox = document.querySelector(`.participant-checkbox[value="${foundEntry[0]}"]`);
                    if (checkbox) checkbox.checked = true;
                }
            });
        }

        alert('¡Análisis con IA completado!');
    } catch (error) {
        console.error("Error calling AI function:", error);
        alert("Ocurrió un error al procesar las notas con IA: " + error.message);
    } finally {
        if (loader) {
            loader.classList.remove('flex');
            loader.classList.add('hidden');
        }
    }
}
