import axiosClient from "./axiosClient";

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await axiosClient.post("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return data;
}

