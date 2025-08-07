import supabase from "@/lib/supabase";

/**
 * 주어진 커플 ID에 대해 couple_points 테이블에 기본 포인트 정보를 생성합니다.
 * 이미 존재하는 경우 아무 작업도 하지 않습니다.
 */
export async function createCouplePoints(coupleId: string): Promise<void> {
  try {
    // 먼저 중복 방지: 이미 존재하는지 확인
    const { data: existing, error: checkError } = await supabase
      .from("couple_points")
      .select("couple_id")
      .eq("couple_id", coupleId)
      .maybeSingle();

    if (checkError) {
      console.error("❌ couple_points 조회 실패:", checkError.message);
      return;
    }

    if (existing) {
      console.log("ℹ️ 이미 존재하는 couple_points입니다.");
      return;
    }

    // 생성
    const { error: insertError } = await supabase.from("couple_points").insert({
      couple_id: coupleId,
      point: 0,
      level: 1,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("❌ couple_points 생성 실패:", insertError.message);
    } else {
      console.log("✅ couple_points 생성 완료!");
    }
  } catch (err) {
    console.error("❌ 예외 발생:", err);
  }
}
