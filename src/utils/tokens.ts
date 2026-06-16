import { getLocation, getAccessToken } from "zmp-sdk/apis";

interface TokensData {
  locationToken: string;
  accessToken: string;
}

const ZALO_ENDPOINT = "https://graph.zalo.me/v2.0/me/info";
// https://developers.zalo.me/app/2037517839662003086/settings
const ZALO_SECRET_KEY = "ZALO_SECRET_KEY";

export const fetchTokens = async (): Promise<TokensData | null> => {
  try {
    const accessToken = await getAccessToken();

    let locationToken = "";
    try {
      const locationResult = await getLocation();
      locationToken = locationResult.token;
    } catch (locationError: any) {
      console.warn("Location fetch error:", locationError);

      if (locationError?.message?.includes("GPS_PERMISSION_DENIED") ||
        locationError?.error === "GPS_PERMISSION_DENIED") {
        console.warn("GPS permission denied - location token will be empty");
        locationToken = "";
      } else {
        throw locationError;
      }
    }

    return {
      locationToken,
      accessToken,
    };
  } catch (error) {
    console.error("Failed to fetch tokens:", error);
    return null;
  }
};

export const buildWebAppUrl = (baseUrl: string, tokens: TokensData): string => {
  const url = new URL(baseUrl);
  url.searchParams.append("locationToken", tokens.locationToken);
  url.searchParams.append("accessToken", tokens.accessToken);
  return url.toString();
};

export const sendTokensToZalo = async (tokens: TokensData): Promise<any> => {
  try {
    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      secret_key: ZALO_SECRET_KEY,
    });

    const url = `${ZALO_ENDPOINT}?${params.toString()}`;

    console.log("Sending request to Zalo API:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: tokens.accessToken,
        code: tokens.locationToken,
        secret_key: ZALO_SECRET_KEY,
      },
    });

    const responseText = await response.text();
    console.log("Zalo API Response:", responseText);

    if (!response.ok) {
      console.error(`API error: ${response.status}`, responseText);
      throw new Error(`API error: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error("Failed to call Zalo API:", error);
    throw error;
  }
};
