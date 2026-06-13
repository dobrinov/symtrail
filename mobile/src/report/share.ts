// Renders the doctor-report HTML to a PDF on-device (expo-print) and opens the
// system share sheet (expo-sharing). All data is local; no backend involvement.
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export async function shareReportPdf(html: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
  }
}
