// src/pages/IntroductionPage.tsx
import HeroSection from "@/components/HeroSection";

export default function IntroductionPanel() {
  return (
    <main className="w-full px-6 py-10 md:px-10 md:py-12">
      {/* Hero
      <section className="mb-8 md:mb-10">
        <HeroSection />
      </section> */}

      {/* 서브카피 */}
      <section className="max-w-3xl mx-auto text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-[#5b3d1d]">
          둘만의 마음을 천천히 모아, 하나의 이야기로.
        </h2>
        <p className="mt-3 text-base md:text-lg text-[#7a5b3a]">
          질문에 답하고, 소소한 순간을 기록하면 감자가 자라나요.
          <br className="hidden md:block" />
          오늘의 마음을 남기고, 내일의 우리를 조금 더 기대해보세요.
        </p>
      </section>

      {/* 특징 그리드 */}
      <section className="max-w-5xl mx-auto">
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1 */}
          <article className="rounded-2xl border bg-[#fff7ef] border-amber-200/70 p-5">
            <div className="text-2xl">🌱</div>
            <h3 className="mt-2 font-semibold text-[#3d2b1f]">감자 성장</h3>
            <p className="mt-1.5 text-sm text-[#6b533b]">
              기록할수록 감자가 자랍니다. 둘의 시간은 눈에 보이는 성취가 돼요.
            </p>
          </article>

          {/* 2 */}
          <article className="rounded-2xl border bg-[#fff7ef]  p-5">
            <div className="text-2xl">💬</div>
            <h3 className="mt-2 font-semibold text-[#3d2b1f]">오늘의 질문</h3>
            <p className="mt-1.5 text-sm text-[#6b533b]">
              매일 다른 질문으로 서로를 조금씩 더 알게 됩니다.
            </p>
          </article>

          {/* 3 */}
          <article className="rounded-2xl border bg-[#fff7ef]  p-5">
            <div className="text-2xl">🔒</div>
            <h3 className="mt-2 font-semibold text-[#3d2b1f]">프라이빗 보관</h3>
            <p className="mt-1.5 text-sm text-[#6b533b]">
              둘만 보는 공간에 안전하게 저장돼요. 나중에 함께 돌아봅니다.
            </p>
          </article>

          {/* 4 */}
          <article className="rounded-2xl border bg-[#fff7ef]  p-5">
            <div className="text-2xl">📅</div>
            <h3 className="mt-2 font-semibold text-[#3d2b1f]">
              기념일 & 스트릭
            </h3>
            <p className="mt-1.5 text-sm text-[#6b533b]">
              이어가는 날들, 다가오는 날들. 우리가 놓치지 않게.
            </p>
          </article>

          {/* 5 */}
          <article className="rounded-2xl border bg-[#fff7ef] p-5">
            <div className="text-2xl">📸</div>
            <h3 className="mt-2 font-semibold text-[#3d2b1f]">한 컷 기록</h3>
            <p className="mt-1.5 text-sm text-[#6b533b]">
              사진 한 장, 메모 한 줄로도 하루가 충분히 특별해집니다.
            </p>
          </article>

          {/* 6 */}
          <article className="rounded-2xl border bg-[#fff7ef] p-5">
            <div className="text-2xl">🔔</div>
            <h3 className="mt-2 font-semibold text-[#3d2b1f]">부드러운 알림</h3>
            <p className="mt-1.5 text-sm text-[#6b533b]">
              부담 없게, 잊지 않게. 필요한 순간에만 다정하게 알려줘요.
            </p>
          </article>
        </div>
      </section>

      {/* 구분선 */}
      <div className="max-w-5xl mx-auto my-10 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

      {/* How it works */}
      <section className="max-w-4xl mx-auto text-center">
        <h3 className="text-xl md:text-2xl font-bold text-[#5b3d1d]">
          어떻게 시작하나요?
        </h3>
        <ol className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <li className="rounded-xl bg-[#fff7ef] border p-5">
            <div className="text-2xl">①</div>
            <p className="mt-1 font-semibold text-[#3d2b1f]">둘이 함께 가입</p>
            <p className="mt-1 text-sm text-[#6b533b]">
              우리의 공간을 만들어요.
            </p>
          </li>
          <li className="rounded-xl bg-[#fff7ef] border p-5">
            <div className="text-2xl">②</div>
            <p className="mt-1 font-semibold text-[#3d2b1f]">
              오늘의 질문에 답
            </p>
            <p className="mt-1 text-sm text-[#6b533b]">
              솔직한 마음을 가볍게 적어봐요.
            </p>
          </li>
          <li className="rounded-xl bg-[#fff7ef] border  p-5">
            <div className="text-2xl">③</div>
            <p className="mt-1 font-semibold text-[#3d2b1f]">감자 키우기</p>
            <p className="mt-1 text-sm text-[#6b533b]">
              기록이 쌓일수록 감자가 자랍니다.
            </p>
          </li>
        </ol>
      </section>

      {/* Contact */}
      <section className="max-w-4xl mx-auto text-center mt-12">
        <h3 className="text-xl md:text-2xl font-bold text-[#5b3d1d]">
          Contact
        </h3>
        <p className="mt-3 text-base text-[#7a5b3a]">
          이메일:{" "}
          <a
            href="mailto:ojr5521@naver.com"
            className="text-amber-600 hover:underline"
          >
            ojr5521@naver.com
          </a>
        </p>
        <p className="mt-1 text-base text-[#7a5b3a]">
          연락처:{" "}
          <a href="tel:01055211476" className="text-amber-600 hover:underline">
            010-5521-1476
          </a>
        </p>
      </section>
    </main>
  );
}
