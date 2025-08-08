import { useEffect, useState } from "react";
import { potatoLevels } from "@/constants/Potatolevels";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

interface CouplePoints {
  level: number;
  point: number;
}

const CIRCLE_RADIUS = 50;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const STROKE_WIDTH = 10;
const OUTLINE_WIDTH = 2;
const OUTLINE_RADIUS = CIRCLE_RADIUS + STROKE_WIDTH / 2 + OUTLINE_WIDTH / 2;

export default function CoupleLevelCard() {
  const { user } = useUser();
  const [data, setData] = useState<CouplePoints | null>(null);
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const fetchCoupleLevel = async () => {
    if (!user?.couple_id) return;

    const { data, error } = await supabase
      .from("couple_points")
      .select("level, point")
      .eq("couple_id", user.couple_id)
      .single();

    if (!error) setData(data);
  };

  useEffect(() => {
    fetchCoupleLevel();
  }, [user?.couple_id]);

  useEffect(() => {
    if (!user?.couple_id) return;

    const channel = supabase
      .channel("realtime-couple-points")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_points",
          filter: `couple_id=eq.${user.couple_id}`,
        },
        () => {
          fetchCoupleLevel();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.couple_id]);
  useEffect(() => {
    if (!data) return;

    const currentProgress = data.point % 10;
    const target = (currentProgress / 10) * 100;

    let frame: number;
    const animate = () => {
      setAnimatedPercent((prev) => {
        const diff = target - prev;
        const step = diff * 0.05;
        const next = prev + step;

        if (Math.abs(diff) < 0.5) return target;
        frame = requestAnimationFrame(animate);
        return next;
      });
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data?.point]);

  if (!data) return null;

  const { level, point } = data;
  const info = potatoLevels[level - 1];
  const nextInfo = potatoLevels[level];

  const circleProps = { cx: "50%", cy: "50%", fill: "none" };

  return (
    <div className="bg-[#fbf8f2] rounded-xl shadow-xl p-4 flex items-center gap-4 w-fit">
      {/* 왼쪽: 감자 레벨 원형 진행도 */}
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg
          className="absolute top-0 left-0 w-full h-full rotate-[-90deg] z-10"
          viewBox="0 0 150 150"
        >
          <defs>
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>
          </defs>

          {/* 외곽선 */}
          <circle
            {...circleProps}
            r={OUTLINE_RADIUS}
            stroke="#e2e8f0"
            strokeWidth={OUTLINE_WIDTH}
            cx="75"
            cy="75"
          />
          {/* 배경 */}
          <circle
            {...circleProps}
            r={CIRCLE_RADIUS}
            stroke="#e5e7eb"
            strokeWidth={STROKE_WIDTH}
            cx="75"
            cy="75"
          />
          {/* 진행도 */}
          <circle
            {...circleProps}
            r={CIRCLE_RADIUS}
            stroke="url(#progressGradient)"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={
              CIRCLE_CIRCUMFERENCE * (1 - animatedPercent / 100)
            }
            strokeLinecap="round"
            cx="75"
            cy="75"
          />
        </svg>

        {/* 감자 이미지 */}
        <img
          src={info?.image}
          alt={info?.name}
          className="w-20 h-20 object-contain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        />
      </div>

      {/* 오른쪽: 제목 + 설명 */}
      <div className="flex flex-col justify-center flex-1">
        <h3 className="text-2xl font-bold text-gray-800">{info?.name}</h3>
        {info?.description && (
          <p className="text-xs text-gray-600 mt-2">{info.description}</p>
        )}
        {level < 5 ? (
          <p className="text-sm text-gray-500 mt-4 mr-4">
            <span className="text-orange-500 font-semibold ">
              {nextInfo?.name}
            </span>{" "}
            까지 <span className="text-orange-600 font-bold">{10 - point}</span>{" "}
            포인트
          </p>
        ) : (
          <p className="text-green-600 font-bold text-sm mt-1">
            🥔 다 자랐어요!
          </p>
        )}
      </div>
    </div>
  );
}

// import { useEffect, useState } from "react";
// import { potatoLevels } from "@/constants/Potatolevels";
// import supabase from "@/lib/supabase";
// import { useUser } from "@/contexts/UserContext";

// interface CouplePoints {
//   level: number;
//   point: number;
// }

// const CIRCLE_RADIUS = 70;
// const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
// const STROKE_WIDTH = 12;
// const OUTLINE_WIDTH = 2;
// const OUTLINE_RADIUS = CIRCLE_RADIUS + STROKE_WIDTH / 2 + OUTLINE_WIDTH / 2;

// export default function CoupleLevelCard() {
//   const { user } = useUser();
//   const [data, setData] = useState<CouplePoints | null>(null);
//   const [animatedPercent, setAnimatedPercent] = useState(0);

//   const fetchCoupleLevel = async () => {
//     if (!user?.couple_id) return;

//     const { data, error } = await supabase
//       .from("couple_points")
//       .select("level, point")
//       .eq("couple_id", user.couple_id)
//       .single();

//     if (error) {
//       console.error("❌ 레벨 정보 조회 실패:", error.message);
//     } else {
//       setData(data);
//     }
//   };

//   useEffect(() => {
//     fetchCoupleLevel();
//   }, [user?.couple_id]);

//   useEffect(() => {
//     if (!user?.couple_id) return;

//     const channel = supabase
//       .channel("realtime-couple-points")
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "couple_points",
//           filter: couple_id=eq.${user.couple_id},
//         },
//         () => {
//           fetchCoupleLevel();
//         }
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [user?.couple_id]);

//   useEffect(() => {
//     if (!data) return;

//     const currentProgress = data.point % 10;
//     const target = (currentProgress / 10) * 100;

//     let frame: number;

//     const animate = () => {
//       setAnimatedPercent((prev) => {
//         const diff = target - prev;
//         const step = diff * 0.05;
//         const next = prev + step;

//         if (Math.abs(diff) < 0.5) return target;

//         frame = requestAnimationFrame(animate);
//         return next;
//       });
//     };

//     frame = requestAnimationFrame(animate);

//     return () => cancelAnimationFrame(frame);
//   }, [data?.point]);

//   if (!data) return null;

//   const { level, point } = data;
//   const info = potatoLevels[level - 1];
//   const nextInfo = potatoLevels[level];

//   const circleProps = {
//     cx: "50%",
//     cy: "50%",
//     fill: "none",
//   };

//   return (
//     <div className="w-full max-w-xs bg-[#fbf8f2] rounded-xl shadow-md p-4 text-center group transition-all duration-300 scale-[0.8]">
//       <div className="text-2xl font-bold mb-2">{info?.name}</div>

//       <div className="relative w-64 h-48 mx-auto">
//         <svg className="absolute top-0 left-0 w-full h-full rotate-[-90deg] z-10">
//           <defs>
//             <linearGradient
//               id="progressGradient"
//               x1="0%"
//               y1="0%"
//               x2="100%"
//               y2="0%"
//             >
//               <stop offset="0%" stopColor="#f97316" />
//               <stop offset="100%" stopColor="#fcd34d" />
//             </linearGradient>
//           </defs>

//           {/* ✅ 외곽선 (테두리용) */}
//           <circle
//             {...circleProps}
//             r={OUTLINE_RADIUS}
//             stroke="#e2e8f0"
//             strokeWidth={OUTLINE_WIDTH}
//             className="transition-colors duration-300"
//           />

//           {/* ✅ 배경 원 (연한 회색) */}
//           <circle
//             {...circleProps}
//             r={CIRCLE_RADIUS}
//             stroke="#e5e7eb" // ✅ 연한 회색 (gray-200)
//             strokeWidth={STROKE_WIDTH}
//           />

//           {/* ✅ 진행 원 (그라데이션만, glow 제거됨) */}
//           <circle
//             {...circleProps}
//             r={CIRCLE_RADIUS}
//             stroke="url(#progressGradient)"
//             strokeWidth={STROKE_WIDTH}
//             strokeDasharray={CIRCLE_CIRCUMFERENCE}
//             strokeDashoffset={
//               CIRCLE_CIRCUMFERENCE * (1 - animatedPercent / 100)
//             }
//             strokeLinecap="round"
//             className="transition-all duration-300"
//           />
//         </svg>

//         {/* ✅ 감자 이미지 */}
//         <img
//           src={info?.image}
//           alt={info?.name}
//           className="w-32 h-32 object-contain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
//         />
//       </div>

//       {/* ✅ 설명 및 포인트 안내 */}
//       {level < 5 ? (
//         <div className="mt-4 text-gray-500 text-sm">
//           <span className="text-orange-500 font-semibold text-lg">
//             {nextInfo?.name}
//           </span>
//           <span> 까지 </span>
//           <span className="text-orange-600 font-bold">{10 - point}</span>
//           <span> 포인트 남았어요!</span>
//         </div>
//       ) : (
//         <div className="mt-4 text-green-600 font-bold text-sm">
//           🥔 다 자랐어요!
//         </div>
//       )}

//       {info?.description && (
//         <div className="text-gray-700">{info.description}</div>
//       )}
//     </div>
//   );
// }
