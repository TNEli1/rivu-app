import React from "react";
import RivuLogo from "./RivuLogo";

export default function MobileHeader() {
  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
      <RivuLogo size={32} />
    </div>
  );
}