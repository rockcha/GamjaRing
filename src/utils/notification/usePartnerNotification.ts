import { useCallback } from "react";
import { toast } from "sonner";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import {
  sendUserNotification,
  type SendUserNotificationInput,
} from "@/utils/notification/sendUserNotification";

type PartnerNotificationPayload = Omit<
  SendUserNotificationInput,
  "senderId" | "receiverId"
>;

type SendOptions = {
  successMessage?: string;
  errorMessage?: string;
  showSuccess?: boolean;
  showError?: boolean;
};

const DEFAULT_ERROR_MESSAGE =
  "알림 전송에 실패했어요. 잠시 후 다시 시도해주세요.";
const MISSING_PARTNER_MESSAGE =
  "로그인/파트너 정보를 확인해주세요.";

export function usePartnerNotification() {
  const { user } = useUser();
  const { partnerId } = useCoupleContext();

  const senderId = user?.id ?? null;
  const receiverId = partnerId ?? user?.partner_id ?? null;
  const canSendToPartner = Boolean(senderId && receiverId);

  const sendToPartner = useCallback(
    async (
      payload: PartnerNotificationPayload,
      {
        successMessage,
        errorMessage = DEFAULT_ERROR_MESSAGE,
        showSuccess = false,
        showError = true,
      }: SendOptions = {}
    ) => {
      if (!senderId || !receiverId) {
        if (showError) toast.error(MISSING_PARTNER_MESSAGE);
        return { error: new Error(MISSING_PARTNER_MESSAGE) };
      }

      try {
        const result = await sendUserNotification({
          senderId,
          receiverId,
          ...payload,
        });

        if (result.error) {
          if (showError) toast.error(errorMessage);
          return result;
        }

        if (showSuccess && successMessage) {
          toast.success(successMessage);
        }

        return result;
      } catch (error) {
        if (showError) toast.error(errorMessage);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
    [receiverId, senderId]
  );

  return {
    canSendToPartner,
    partnerId: receiverId,
    senderId,
    sendToPartner,
  };
}
