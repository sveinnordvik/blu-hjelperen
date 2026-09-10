// @ts-ignore
import mammoth from 'mammoth';

/**
 * Extracts raw text from a .docx file using mammoth.
 * @param file The file object from a file input
 * @returns Promise<string>
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (error) {
        reject(new Error('Klarte ikke å lese Word-filen. Er den korrupt?'));
      }
    };
    reader.onerror = () => reject(new Error('Feil ved lesing av filen.'));
    reader.readAsArrayBuffer(file);
  });
}
