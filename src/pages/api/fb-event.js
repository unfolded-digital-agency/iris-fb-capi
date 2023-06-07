// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createHash } from "crypto";
import Cookies from "universal-cookie/cjs";

const sha256Hash = (string) =>
  createHash("sha256").update(string).digest("hex");

const getClientFbp = (req) => {
  const cookies = new Cookies(req.headers.cookie);
  if (!cookies.get("_fbp")) return "";
  return cookies.get("_fbp");
};

const getClientFbc = (req) => {
  if (req.headers?.referer) {
    const url = new URL(req.headers?.referer);
    if (url.searchParams.has("fbclid"))
      return url.searchParams.get("fbclid") ?? "";
  }

  const cookies = new Cookies(req.headers.cookie);
  if (!cookies.get("_fbc")) return "";
  return cookies.get("_fbc");
};

const getClientIpAddress = (req) => {
  const ipAddress = req.headers["x-real-ip"] || req.connection?.remoteAddress;
  if (ipAddress) return String(ipAddress);

  const xForwardedFor = req.headers["x-forwarded-for"] ?? "";
  return xForwardedFor.split(",")[0];
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(400).json({
      message: "This route only accepts POST requests",
    });
  }

  if (!process.env.FB_ACCESS_TOKEN) {
    throw new Error("Missing FB_ACCESS_TOKEN in environment file.");
  }

  if (!process.env.NEXT_PUBLIC_FB_PIXEL_ID) {
    throw new Error("Missing NEXT_PUBLIC_FB_PIXEL_ID in environment file.");
  }

  const formData = new FormData();
  const eventData = [
    {
      event_name: req?.body?.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: req?.body?.eventId,
      event_source_url: req?.body?.sourceUrl,
      action_source: "website",
      user_data: {
        client_ip_address: getClientIpAddress(req),
        client_user_agent: req?.body?.userAgent,
        ...(req?.body?.emails &&
          req?.body?.emails?.length > 0 && {
            em: req?.body?.emails.map((email) => sha256Hash(email)),
          }),
        ...(req?.body?.phones &&
          req?.body?.phones?.length > 0 && {
            ph: req?.body?.phones.map((phone) => sha256Hash(phone)),
          }),
        fbp: getClientFbp(req),
        fbc: getClientFbc(req),
      },
      contents:
        req?.body?.products?.map((product) => ({
          id: product.id,
          quantity: product.quantity,
        })) || null,
      custom_data: {
        ...(req?.body?.value && { value: req?.body?.value }),
        ...(req?.body?.currency && { currency: req?.body?.currency }),
      },
    },
  ];

  formData.append("data", JSON.stringify(eventData));
  formData.append("access_token", process.env.FB_ACCESS_TOKEN ?? "");

  try {
    const response = await fetch(
      `https://graph.facebook.com/v13.0/${process.env.NEXT_PUBLIC_FB_PIXEL_ID}/events`,
      {
        method: "POST",
        body: formData,
      }
    );

    const responseData = await response.json();
    const success = responseData?.events_received === 1;
    if (!success)
      return res.status(400).json({
        success,
        ...responseData?.error,
      });

    return res.status(200).json({
      success,
      responseData,
    });
  } catch (error) {
    return res.status(500).json({
      error,
    });
  }
}
