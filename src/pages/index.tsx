import React from "react";
import { Page } from "zmp-ui";
import { openChat, addRating, favoriteApp, openShareSheet } from "zmp-sdk";

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

const HomePage: React.FunctionComponent = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Page style={{ padding: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
      <iframe
        src="https://tattantat67k1.web.app/"
        style={{ flex: 1, width: "100%", border: "none" }}
        title="Tất Tân Tật"
      />

      {open && <div className="fab-backdrop" onClick={() => setOpen(false)} />}

      <div className="fab-container">
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

        <button className={`fab-main ${open ? "open" : ""}`} onClick={() => setOpen((v) => !v)}>
          ✦
        </button>
      </div>
    </Page>
  );
};

export default HomePage;
