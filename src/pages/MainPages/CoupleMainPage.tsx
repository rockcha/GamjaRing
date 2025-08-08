import { useUser } from "@/contexts/UserContext";
import HeroSection from "@/components/HeroSection";
import HeroSection2 from "@/components/HeroSection2";

export default function CoupleMainPage() {
  const { user, loading } = useUser();

  // if (loading || !user) {
  //   return <PotatoLoading />;
  // }

  return (
    <div className="min-h-screen py-1  flex flex-col gap-4">
      {/* 👉 여기 flex-row로 가로 배치 */}

      <div className="flex flex-col md:flex-row gap-12 justify-center items-center mt-10">
        <HeroSection />
        <HeroSection2 />
      </div>
    </div>
  );
}
