import { Link } from "react-router-dom";

interface NavButtonProps {
  imgSrc: string;
  description: string;
  to: string;
  bgColor?: string;
}

export default function NavButton({
  imgSrc,
  description,
  to,
  bgColor = "#fdf6ee",
}: NavButtonProps) {
  return (
    <Link to={to} className="block w-[240px] h-[120px]">
      <div
        className="w-full h-full rounded-3xl bg-white
        overflow-hidden border shadow-sm border-gray-200 group transition-transform duration-300 hover:scale-105 flex items-center justify-start px-10 gap-4"
      >
        <img
          src={imgSrc}
          alt={description}
          className="w-14 h-14 object-contain transition duration-300"
        />
        <div className="text-lg font-semibold text-[#3d2b1f] relative inline-block">
          {description}
          <span className="absolute left-0 bottom-[-4px] w-0 h-[6px] bg-amber-300 rounded-full transition-all duration-700 group-hover:w-full"></span>
        </div>
      </div>
    </Link>
  );
}
