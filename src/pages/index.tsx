import React from "react";
import { useLocation } from "react-router-dom";
import { Page, Modal } from "zmp-ui";
import { openChat, addRating, favoriteApp, openShareSheet } from "zmp-sdk";
import { getAccessToken, saveImageToGallery } from "zmp-sdk/apis";
import { fetchTokens, buildWebAppUrl, sendTokensToZalo } from "../utils/tokens";

const DEFAULT_WEB_APP_URL = "https://tattantat67k1.web.app/";
const WEB_APP_ORIGIN = new URL(DEFAULT_WEB_APP_URL).origin;

// Must match LOCATION_BRIDGE_REQUEST_TYPE / LOCATION_BRIDGE_RESULT_TYPE in
// tattantat-phutan's src/utils/geolocation.js — the embedded web app posts a
// request here whenever the user taps a "get current location" button, since
// it cannot prompt for geolocation permission itself from inside the iframe.
const LOCATION_BRIDGE_REQUEST_TYPE = "TATTANTAT_GET_CURRENT_LOCATION";
const LOCATION_BRIDGE_RESULT_TYPE = "TATTANTAT_LOCATION_RESULT";

type PendingLocationRequest = {
  requestId: string;
  source: MessageEventSource;
};

const getDeepLinkWebAppUrl = (search: string): string => {
  const params = new URLSearchParams(search);
  const type = params.get("type");
  const id = params.get("id");

  if (!id) return DEFAULT_WEB_APP_URL;

  if (type === "vlog") {
    return `https://tattantat67k1.web.app/vlogs?v=${encodeURIComponent(id)}`;
  }
  if (type === "post") {
    return `https://tattantat67k1.web.app/post-detail/${encodeURIComponent(id)}`;
  }
  return DEFAULT_WEB_APP_URL;
};

const actions = [
  {
    icon: "💬",
    label: "Liên hệ báo cáo lỗi",
    color: "#007aff",
    onClick: () => openChat({ type: "user", id: "890035537718038844", message: "Xin Chào" }),
  },
  {
    icon: "⭐",
    label: "Đánh giá",
    color: "#ff9500",
    onClick: () => addRating({ success: () => { }, fail: () => { } }),
  },
  {
    icon: "🔖",
    label: "Yêu thích",
    color: "#34c759",
    onClick: () => favoriteApp({ success: () => { }, fail: () => { } }),
  },
  {
    icon: "📤",
    label: "Chia sẻ",
    color: "#af52de",
    onClick: () =>
      openShareSheet({
        type: "zmp",
        data: {
          title: "Tất tần tật về 67k1, Phú tân cũ",
          description: "Vòng quanh 1 thoáng Phú tân(cũ), An giang - 67K1",
          thumbnail: "https://logo-mapps.zdn.vn/cover-photos/e5b9a66e062bef75b63a.jpg",
        },
        success: () => { },
        fail: () => { },
      }),
  },
];

const RATING_HINT_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 ngày
const RATING_HINT_STORAGE_KEY = "ratingHintLastShownAt";

const HomePage: React.FunctionComponent = () => {
  const location = useLocation();
  const deepLinkUrl = React.useMemo(() => getDeepLinkWebAppUrl(location.search), [location.search]);

  const [open, setOpen] = React.useState(false);
  const [iframeUrl, setIframeUrl] = React.useState(deepLinkUrl);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showRatingHint, setShowRatingHint] = React.useState(false);
  const [pendingLocationRequest, setPendingLocationRequest] = React.useState<PendingLocationRequest | null>(null);
  const [locationRequestBusy, setLocationRequestBusy] = React.useState(false);

  const dismissRatingHint = () => setShowRatingHint(false);

  React.useEffect(() => {
    try {
      const now = Date.now();
      const lastShownAt = Number(localStorage.getItem(RATING_HINT_STORAGE_KEY) || 0);
      if (now - lastShownAt >= RATING_HINT_INTERVAL) {
        setShowRatingHint(true);
        localStorage.setItem(RATING_HINT_STORAGE_KEY, String(now));
      }
    } catch (error) {
      console.error("Error reading rating hint state:", error);
    }
  }, []);

  React.useEffect(() => {
    if (!showRatingHint) return;
    const timer = setTimeout(() => setShowRatingHint(false), 8000);
    return () => clearTimeout(timer);
  }, [showRatingHint]);

  React.useEffect(() => {
    // Only fetch the access token on mount — do NOT call getLocation() here.
    // Requesting geolocation permission immediately when the web view opens
    // violates policy; location is only requested later, after the user taps
    // "Cho phép" on the in-app dialog triggered by the embedded web app
    // (see the message-bridge effect + handleAllowLocation below).
    const initializeAccessToken = async () => {
      try {
        const accessToken = await getAccessToken();
        const urlWithTokens = buildWebAppUrl(deepLinkUrl, { accessToken, locationToken: "" });
        setIframeUrl(urlWithTokens);
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    };
    initializeAccessToken();
  }, [deepLinkUrl]);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== WEB_APP_ORIGIN) return;
      const data = event.data;
      if (!data) return;

      // Handle Newspaper Image Export from embedded Web App
      if (data.type === "NEWSPAPER_EXPORT" && data.dataUrl) {
        console.log("[ZaloApp] Received NEWSPAPER_EXPORT from iframe", data.filename);
        try {
          saveImageToGallery({
            imageUrl: data.dataUrl,
            success: () => {
              console.log("[ZaloApp] Image saved to gallery successfully");
              try {
                openShareSheet({
                  type: "zmp",
                  data: {
                    title: "Tờ Báo Phú Tân Của Tôi",
                    description: "Xem tờ báo tôi vừa khởi tạo bằng AI trên Tất Tần Tật Phú Tân!",
                    thumbnail: "https://logo-mapps.zdn.vn/cover-photos/e5b9a66e062bef75b63a.jpg",
                  },
                  success: () => {},
                  fail: (err) => console.warn("[ZaloApp] Share sheet fail:", err),
                });
              } catch (shareErr) {
                console.warn("[ZaloApp] Share sheet exception:", shareErr);
              }
            },
            fail: (err) => {
              console.warn("[ZaloApp] Failed to save image to gallery:", err);
              try {
                openShareSheet({
                  type: "zmp",
                  data: {
                    title: "Tờ Báo Phú Tân Của Tôi",
                    description: "Xem tờ báo tôi vừa khởi tạo bằng AI trên Tất Tần Tật Phú Tân!",
                    thumbnail: "https://logo-mapps.zdn.vn/cover-photos/e5b9a66e062bef75b63a.jpg",
                  },
                  success: () => {},
                  fail: (err) => console.warn("[ZaloApp] Share sheet fail:", err),
                });
              } catch (shareErr) {
                console.warn("[ZaloApp] Share sheet exception:", shareErr);
              }
            }
          });
        } catch (e) {
          console.error("[ZaloApp] Error handling newspaper export:", e);
        }
        return;
      }

      if (data.type !== LOCATION_BRIDGE_REQUEST_TYPE || !data.requestId || !event.source) return;

      console.log("[HomePage] location request received from iframe", {
        requestId: data.requestId,
        origin: event.origin,
      });

      setPendingLocationRequest({ requestId: data.requestId, source: event.source });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const replyToLocationRequest = (request: PendingLocationRequest, payload: Record<string, unknown>) => {
    console.log("[HomePage] replying to location request", { requestId: request.requestId, payload });
    (request.source as Window).postMessage(
      { type: LOCATION_BRIDGE_RESULT_TYPE, requestId: request.requestId, ...payload },
      WEB_APP_ORIGIN
    );
  };

  const handleAllowLocation = async () => {
    if (!pendingLocationRequest) return;
    const request = pendingLocationRequest;
    setLocationRequestBusy(true);
    try {
      const tokens = await fetchTokens();
      if (!tokens || !tokens.locationToken) {
        throw { message: "GPS_PERMISSION_DENIED" };
      }

      const response = await sendTokensToZalo(tokens);
      console.log("[HomePage] resolved location via Zalo API", response);

      if (!response?.data?.latitude || !response?.data?.longitude) {
        throw new Error("Không thể xác định vị trí.");
      }

      replyToLocationRequest(request, {
        success: true,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
      });
    } catch (error: any) {
      console.error("[HomePage] failed to resolve location", error);
      const isDenied = error?.message?.includes("GPS_PERMISSION_DENIED") || error?.error === "GPS_PERMISSION_DENIED";
      replyToLocationRequest(request, {
        success: false,
        code: isDenied ? 1 : "zalo_error",
        message: isDenied
          ? "Bạn chưa cấp quyền truy cập GPS cho ứng dụng."
          : "Không thể lấy vị trí từ Zalo.",
      });
    } finally {
      setLocationRequestBusy(false);
      setPendingLocationRequest(null);
    }
  };

  const handleDenyLocation = () => {
    if (!pendingLocationRequest) return;
    console.log("[HomePage] user denied location permission dialog", { requestId: pendingLocationRequest.requestId });
    replyToLocationRequest(pendingLocationRequest, {
      success: false,
      code: 1,
      message: "Bạn đã từ chối chia sẻ vị trí.",
    });
    setPendingLocationRequest(null);
  };

  return (
    <Page style={{ padding: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
      <Modal
        visible={!!pendingLocationRequest}
        title="Cho phép truy cập vị trí?"
        description="Tất Tân Tật muốn dùng vị trí hiện tại của bạn để hiển thị các nội dung gần bạn."
        onClose={handleDenyLocation}
        actions={[
          { text: "Không cho phép", onClick: handleDenyLocation, disabled: locationRequestBusy },
          { text: "Cho phép", onClick: handleAllowLocation, highLight: true, disabled: locationRequestBusy },
        ]}
      />

      {isLoading && (
        <div className="iframe-loading">
          <div className="spinner"></div>
        </div>
      )}

      <iframe
        src={iframeUrl}
        style={{ flex: 1, width: "100%", border: "none" }}
        title="Tất Tân Tật"
        onLoad={() => setIsLoading(false)}
      />

      {open && <div className="fab-backdrop" onClick={() => setOpen(false)} />}

      <div className="fab-container">
        {showRatingHint && !open && (
          <div
            className="fab-rating-hint"
            onClick={() => {
              dismissRatingHint();
              addRating({ success: () => { }, fail: () => { } });
            }}
          >
            <span>⭐ Bạn thấy app thế nào? Đánh giá 5 sao nhé!</span>
            <button
              className="fab-rating-hint-close"
              onClick={(e) => { e.stopPropagation(); dismissRatingHint(); }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="fab-sub-buttons">
          {[...actions].reverse().map((action, i) => (
            <div
              key={action.label}
              className={`fab-sub-item ${open ? "open" : ""}`}
              style={{ transitionDelay: open ? `${i * 0.05}s` : `${(actions.length - 1 - i) * 0.03}s` }}
            >
              <span className="fab-sub-label">{action.label}</span>
              <button
                className="fab-sub-btn"
                style={{ background: action.color }}
                onClick={() => { setOpen(false); action.onClick(); }}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>

        <button
          className={`fab-main ${open ? "open" : ""} ${showRatingHint && !open ? "pulse" : ""}`}
          onClick={() => { dismissRatingHint(); setOpen((v) => !v); }}
        >
          ✦
        </button>
      </div>
    </Page>
  );
};

export default HomePage;
