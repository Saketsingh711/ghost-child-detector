
import { GoogleGenAI } from "@google/genai";
import { DistrictData } from "../types";

export const getAuditAnalysis = async (data: DistrictData[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const topDistricts = data.slice(0, 5).map(d => `${d.district} (${d.state}): ${d.total_ghost_children} suspected ghosts`).join(', ');
    
    const prompt = `Analyze the following high-risk ghost-child registration data from the Aadhaar audit system.
    Data Summary of Top 5 districts: ${topDistricts}.
    
    Provide a concise (max 3 bullets) strategic audit recommendation for the field officers. Focus on methodology (like Biometric verification vs. Manual outreach) and fiscal recovery potential. Output in clear text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Unable to generate AI analysis at this time. Please proceed with manual audit protocols based on current risk scores.";
  }
};
