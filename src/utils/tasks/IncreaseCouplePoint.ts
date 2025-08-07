import supabase from "@/lib/supabase";

/**
 * 커플의 감자 포인트를 1 증가시키고,
 * 포인트가 10 이상이면 레벨도 1 올리며 포인트는 0으로 초기화합니다.
 * 최대 레벨은 5입니다.
 */
export async function increaseCouplePoint(coupleId: string): Promise<void> {
  try {
    // 1. 현재 포인트/레벨 조회
    const { data, error } = await supabase
      .from("couple_points")
      .select("point, level")
      .eq("couple_id", coupleId)
      .single();

    if (error || !data) {
      console.error("❌ 감자 포인트 조회 실패:", error?.message);
      return;
    }

    let { point, level } = data;

    // 2. 포인트 +1
    point += 1;

    // 3. 레벨업 조건 확인
    if (point >= 10) {
      point = 0;
      level = Math.min(level + 1, 5); // 최대 레벨 5
    }

    // 4. DB 업데이트
    const { error: updateError } = await supabase
      .from("couple_points")
      .update({
        point,
        level,
        updated_at: new Date().toLocaleDateString("sv-SE"),
      })
      .eq("couple_id", coupleId);

    if (updateError) {
      console.error("❌ 포인트 업데이트 실패:", updateError.message);
    } else {
      console.log("✅ 포인트/레벨 업데이트 완료");
    }
  } catch (err) {
    console.error("❌ 예외 발생:", err);
  }
}
