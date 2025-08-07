// import { Outlet } from "react-router-dom";
// import MainHeader from "@/components/MainHeader";
// import PageTransition from "@/components/PageTransition";

// export default function AppLayout() {
//   return (
//     <>
//       <main className="w-full max-w-3xl mx-auto px-4">
//         <MainHeader />
//         <PageTransition>
//           <Outlet />
//         </PageTransition>
//       </main>
//     </>
//   );
// }
import { Outlet } from "react-router-dom";
import MainHeader from "@/components/MainHeader";
import PageTransition from "@/components/PageTransition";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f1efe7] px-4 py-6 flex justify-center items-start">
      <div className="w-full max-w-3xl bg-[#d6c3b4] rounded-2xl shadow-lg px-6 py-8 border border-[#e5e3dc]">
        <MainHeader />
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  );
}
