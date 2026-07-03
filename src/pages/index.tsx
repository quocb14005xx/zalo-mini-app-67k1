import React from "react";
import { Page } from "zmp-ui";
import { openChat, addRating, favoriteApp, openShareSheet } from "zmp-sdk";
import { fetchTokens, buildWebAppUrl, sendTokensToZalo } from "../utils/tokens";

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

const RATING_HINT_INTERVAL = 10 * 1000; // TODO: đổi lại 3 * 24 * 60 * 60 * 1000 (3 ngày) trước khi release
const RATING_HINT_STORAGE_KEY = "ratingHintLastShownAt";

const HomePage: React.FunctionComponent = () => {
  const [open, setOpen] = React.useState(false);
  const [iframeUrl, setIframeUrl] = React.useState("https://tattantat67k1.web.app/");
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showRatingHint, setShowRatingHint] = React.useState(false);

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
    const initializeTokens = async () => {
      const tokens = await fetchTokens();
      if (tokens) {
        let urlWithTokens = buildWebAppUrl("https://tattantat67k1.web.app/", tokens);
        setIframeUrl(urlWithTokens);

        try {
          const response = await sendTokensToZalo(tokens);
          console.log("Zalo API call successful:", response);

          if (response?.data?.latitude && response?.data?.longitude) {
            const { latitude, longitude } = response.data;
            const urlWithLocation = new URL(urlWithTokens);
            urlWithLocation.searchParams.append("lat", latitude);
            urlWithLocation.searchParams.append("long", longitude);
            setIframeUrl(urlWithLocation.toString());
          }
        } catch (error: any) {
          console.error("Error calling Zalo API:", error);

          if (error.message?.includes("GPS_PERMISSION_DENIED")) {
            setLocationError("Vui lòng cấp quyền truy cập vị trí để có thể tìm các bài blog gần bạn");
            setTimeout(() => setLocationError(null), 5000);
          }
        }
      }
    };
    initializeTokens();
  }, []);

  return (
    <Page style={{ padding: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
      {locationError && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "#ff9500",
          color: "white",
          textAlign: "center",
          fontSize: "14px",
          zIndex: 1000
        }}>
          {locationError}
        </div>
      )}

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
