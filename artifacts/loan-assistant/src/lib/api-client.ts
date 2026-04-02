export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("loan_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
