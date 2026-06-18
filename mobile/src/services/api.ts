import axios from "axios";

export function getServer() {
  return (
    localStorage.getItem("poskey_server") ||
    `http://${window.location.hostname}:8000`
  );
}

export function saveServer(url: string) {
  localStorage.setItem(
    "poskey_server",
    url.replace(/\/$/, "")
  );
}

export const api = axios.create({
  baseURL: getServer(),
});

export function refreshApi() {
  api.defaults.baseURL = getServer();
}