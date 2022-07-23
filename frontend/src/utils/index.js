export function secondDurationToDisplayDuration(secondDuration, allowZero = false) {
    if (!secondDuration) {
        return allowZero ? "00:00" : " - ";
    }
    secondDuration = parseInt(secondDuration);
    let duration = secondDuration;
    let minute = Math.floor(duration / 60);
    let second = duration % 60;
    if (minute < 10) {
        minute = "0" + minute;
    }
    if (second < 10) {
        second = "0" + second;
    }
    return minute + ":" + second;
}

export function sourceCodeToName(source) {
    return {
        "qq": "QQ音乐",
        "xiami": "虾米音乐",
        "netease": "网易云音乐",
        "kugou": "酷狗音乐",
        "kuwo": "酷我音乐",
        "migu": "咪咕音乐",
        "bilibili": "Bilibili",
        "douyin": "抖音",
        "youtube": "YouTube",
    }[source] || "未知";
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function ellipsis(value, maxLength) {
    if (!value) {
        return "";
    }
    value = value.trim();
    if (!value) return "";
    if (value.length > maxLength) {
      return value.slice(0, maxLength) + "...";
    }
    return value;
  }