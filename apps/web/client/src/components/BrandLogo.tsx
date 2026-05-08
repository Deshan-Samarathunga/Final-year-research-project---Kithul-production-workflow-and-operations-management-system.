export function BrandLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="logo-cube" aria-hidden="true">
        <span />
      </div>
      <span className="text-[20px] font-bold tracking-normal">
        <span className="text-blue-600">Kithul</span>
        <span className="text-orange-500">Flow</span>
      </span>
    </div>
  );
}
