import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/stores/useAuthStore";
import type { User } from "@/types/auth";
import type { ProfileUpdatePayload, PasswordChangePayload } from "@/types/profile";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<{ member: User }, Error, ProfileUpdatePayload>({
    mutationFn: (payload) =>
      apiClient.patch<{ member: User }>("/api/v1/profile", { member: payload }),

    onSuccess: (data) => {
      if (data.member) {
        setUser(data.member);
        void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    },
  });
}

export function useChangePassword() {
  return useMutation<{ message: string }, Error, PasswordChangePayload>({
    mutationFn: (payload) =>
      apiClient.patch<{ message: string }>("/api/v1/profile/password", payload),
  });
}
