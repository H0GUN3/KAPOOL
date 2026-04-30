export const theme = {
  bg0: "#05091A",
  bg1: "#0B1120",
  bg2: "#111827",
  card: "rgba(255,255,255,0.04)",
  cardHov: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.09)",
  borderBri: "rgba(255,255,255,0.18)",
  mint: "#00E5B8",
  mintDim: "rgba(0,229,184,0.13)",
  mintGlow: "rgba(0,229,184,0.30)",
  blue: "#5B7EFF",
  blueDim: "rgba(91,126,255,0.13)",
  warm: "#FF8F5E",
  warmDim: "rgba(255,143,94,0.13)",
  rose: "#FF5E8F",
  txt0: "#FFFFFF",
  txt1: "rgba(255,255,255,0.70)",
  txt2: "rgba(255,255,255,0.40)",
  r8: "8px",
  r12: "12px",
  r16: "16px",
  r20: "20px",
  r24: "24px",
  r999: "9999px",
};

export const AVATAR_COLORS = [
  ["#5B7EFF", "#00E5B8"],
  ["#FF6B9D", "#FFB347"],
  ["#A78BFA", "#60A5FA"],
  ["#F59E0B", "#EF4444"],
];

export const RIDES = [
  {
    id: 1,
    from: "전주",
    to: "군산대",
    time: "오전 08:30",
    seats: 2,
    fare: 5000,
    status: "open",
    driver: "김민준",
    avIdx: 0,
    waypoints: ["팔복동", "개정IC"],
  },
  {
    id: 2,
    from: "익산",
    to: "군산대",
    time: "오전 09:00",
    seats: 0,
    fare: 4000,
    status: "full",
    driver: "이서연",
    avIdx: 1,
    waypoints: [],
  },
  {
    id: 3,
    from: "전주",
    to: "군산대",
    time: "오후 01:30",
    seats: 1,
    fare: 5000,
    status: "open",
    driver: "박지호",
    avIdx: 2,
    waypoints: ["완산구"],
  },
  {
    id: 4,
    from: "군산",
    to: "군산대",
    time: "오전 08:00",
    seats: 3,
    fare: 3000,
    status: "open",
    driver: "최민서",
    avIdx: 3,
    waypoints: [],
  },
];

export const REQUESTS = [
  {
    from: "전주",
    to: "군산대",
    time: "오전 9시 이후",
    content: "효자동에서 출발하는 차주님 구합니다!",
  },
  {
    from: "익산",
    to: "군산대",
    time: "오후 2~4시",
    content: "오후 강의 끝나고 같이 가실 분!",
  },
  {
    from: "군산",
    to: "군산대",
    time: "오전 8시대",
    content: "이마트 방향에서 탑승 가능합니다.",
  },
];

export const REGIONS = ["전체", "전주", "익산", "군산", "기타"];

export const DATES = [
  { day: "어제", date: "27", active: false },
  { day: "오늘", date: "29", active: true },
  { day: "내일", date: "30", active: false },
  { day: "수", date: "1", active: false },
  { day: "목", date: "2", active: false },
];

export const FARE_OPTS = [
  { key: "전주", label: "전주 권역", price: 5000 },
  { key: "익산", label: "익산 권역", price: 4000 },
  { key: "군산", label: "군산 권역", price: 3000 },
  { key: "기타", label: "기타", price: null },
];

export const MSGS_INIT = [
  { type: "system", text: "이서연님이 입장했습니다" },
  {
    type: "sysinfo",
    text: "차량: 흰색 아반떼 · 번호 뒷자리: 1234\n계좌: 카카오뱅크 3333-xx-1234 · 금액: 5,000원",
  },
  {
    type: "other",
    name: "김민준",
    idx: 0,
    text: "안녕하세요! 오늘 팔복동 경유해서 갑니다 😊",
  },
  { type: "me", text: "네 감사합니다! 정류장 위치 알려주실 수 있을까요?" },
  {
    type: "other",
    name: "김민준",
    idx: 0,
    text: "호남제일문 앞에서 픽업할게요!",
  },
  { type: "other", name: "박지호", idx: 2, text: "확인했습니다. 감사해요 🙏" },
];

export const PRESETS = ["📍 도착 안내", "💳 계좌 안내", "🙏 감사 인사"];
