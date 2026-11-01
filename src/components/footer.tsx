import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#222220] bg-[#080808] text-[#88857e] mt-12 sm:mt-20">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 font-mono text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 64 64"
            fill="none"
            className="shrink-0"
            aria-hidden="true"
          >
            <rect width="64" height="64" fill="#080808" />
            <rect x="3" y="3" width="58" height="58" stroke="#FFB300" strokeWidth="4" />
            <rect x="11" y="12" width="42" height="16" fill="#FFB300" />
            <circle cx="22" cy="20" r="4.5" fill="#080808" />
            <circle cx="42" cy="20" r="4.5" fill="#080808" />
            <path d="M16 36 H25 V49 H16 Z" fill="#F2EFE9" />
            <path d="M39 36 H48 V49 H39 Z" fill="#F2EFE9" />
            <circle cx="32" cy="42.5" r="5" fill="#00E676" />
          </svg>
          <div className="space-y-1 min-w-0">
            <div className="text-[#f2efe9] font-bold tracking-wider text-[11px] sm:text-xs">
              KINETIX // AUTONOMOUS SONAR-GUIDED MOBILE MANIPULATION
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#88857e] leading-relaxed">
              Built by{" "}
              <a
                href="https://tanisheesh.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f2efe9] hover:text-[#ffb300] underline underline-offset-2"
              >
                Tanish Poddar
              </a>{" "}
              · Arduino UNO ATmega328P + 40 kHz HC-SR04 Sonar + L298N Dual H-Bridge + 50 Hz SG90 Gripper
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] sm:text-[11px] uppercase tracking-wider">
          <Link href="/" className="hover:text-[#ffb300] transition">
            [01] Spec
          </Link>
          <Link href="/playground" className="hover:text-[#ffb300] transition">
            [02] 3D Stage
          </Link>
          <Link href="/hardware" className="hover:text-[#ffb300] transition">
            [03] Hardware &amp; Wiring
          </Link>
          <Link href="/how-it-works" className="hover:text-[#ffb300] transition">
            [04] Kinematics &amp; Math
          </Link>
          <a
            href="https://github.com/tanisheesh/KinetiX"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#f2efe9] hover:text-[#ffb300] transition"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
