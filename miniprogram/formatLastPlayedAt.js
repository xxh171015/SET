function formatLastPlayedAt(iso) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatProgress(positionSeconds, durationSeconds) {
  if (durationSeconds > 0) {
    return `${Math.floor(positionSeconds || 0)}秒 / ${Math.floor(durationSeconds)}秒`;
  }
  if (positionSeconds != null && positionSeconds > 0) {
    return `${Math.floor(positionSeconds)}秒`;
  }
  return "";
}

module.exports = { formatLastPlayedAt, formatProgress };
