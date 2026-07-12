import QRCode from "qrcode";

/**
 * Generates a QR code as a base64 data URL for a given asset tag.
 * The QR code encodes the full asset URL for scanning.
 */
export async function generateAssetQRCode(
  assetId: string,
  assetTag: string,
  baseUrl: string = process.env.NEXTAUTH_URL || "http://localhost:3000"
): Promise<string> {
  const assetUrl = `${baseUrl}/assets/${assetId}`;

  const qrCodeDataUrl = await QRCode.toDataURL(assetUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 256,
    color: {
      dark: "#1a1a2e",   // Dark blue matching AssetFlow brand
      light: "#ffffff",
    },
  });

  return qrCodeDataUrl;
}

/**
 * Generates a QR code as SVG string (for embedding in pages)
 */
export async function generateAssetQRCodeSVG(
  assetId: string,
  baseUrl: string = process.env.NEXTAUTH_URL || "http://localhost:3000"
): Promise<string> {
  const assetUrl = `${baseUrl}/assets/${assetId}`;
  return QRCode.toString(assetUrl, { type: "svg" });
}
