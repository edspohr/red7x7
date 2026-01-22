import { GoogleGenerativeAI } from "@google/generative-ai";

export async function handleProcessMeetingAI(allUsers) {
  let apiKey;
  try {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  } catch (e) {
    console.error("Error accediendo a env vars:", e);
  }

  if (!apiKey) {
    alert("API Key de Gemini no configurada. Por favor revisa tu archivo .env");
    return;
  }

  const notesInput = document.getElementById("meeting-notes-text");
  if (!notesInput) {
    console.warn("Input 'meeting-notes-text' no encontrado en el DOM");
    alert("Error interno: No se encuentra el campo de notas.");
    return;
  }
  const notes = notesInput.value;

  if (!notes) {
    alert("Por favor, pega las notas de la reunión en el área de texto.");
    return;
  }
  const loader = document.getElementById("ai-loader");
  if (loader) {
    loader.classList.remove("hidden");
    loader.classList.add("flex");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
        Analiza las siguientes notas de reunión y extrae la información en un formato JSON estricto.
        
        Notas: "${notes}"

        Schema esperado:
        {
          "summary": "Resumen ejecutivo en markdown (puntos clave y acuerdos)",
          "participants": ["Nombre1", "Nombre2"]
        }
        
        Instrucciones:
        - El resumen debe ser claro y profesional.
        - Los participantes deben ser solo los nombres detectados.
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const aiResult = JSON.parse(text);

    if (!aiResult.summary || !aiResult.participants)
      throw new Error("La IA no devolvió el formato esperado.");

    const summaryEl = document.getElementById("meeting-summary");
    if (summaryEl) summaryEl.value = aiResult.summary;

    document
      .querySelectorAll(".participant-checkbox")
      .forEach((cb) => (cb.checked = false));

    if (allUsers) {
      let matches = 0;
      aiResult.participants.forEach((nameFromAI) => {
        const foundEntry = Object.entries(allUsers).find(
          ([id, user]) =>
            user.name.toLowerCase().includes(nameFromAI.toLowerCase()) ||
            nameFromAI.toLowerCase().includes(user.name.toLowerCase()),
        );
        if (foundEntry) {
          const checkbox = document.querySelector(
            `.participant-checkbox[value="${foundEntry[0]}"]`,
          );
          if (checkbox) {
            checkbox.checked = true;
            matches++;
          }
        }
      });
      if (matches > 0)
        alert(`Se detectaron y seleccionaron ${matches} participantes.`);
    }
  } catch (error) {
    console.error("AI Error:", error);
    alert("Error IA: " + (error.message || "Fallo desconocido"));
  } finally {
    if (loader) {
      loader.classList.remove("flex");
      loader.classList.add("hidden");
    }
  }
}
