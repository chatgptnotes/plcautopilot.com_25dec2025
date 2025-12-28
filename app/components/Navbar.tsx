'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

// Coming soon features - grayed out and not clickable
const COMING_SOON_FEATURES = [
  { name: 'AI Co-Pilot', icon: 'bolt' },
  { name: 'HMI Generator', icon: 'devices' },
  { name: 'AI Code Optimizer', icon: 'code' },
  { name: 'Library Manager', icon: 'folder' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-md' : 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg'
    } border-b border-gray-100 dark:border-gray-800`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              PLCAutoPilot
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {/* Active Links */}
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors dark:text-gray-300 dark:hover:text-blue-400">
              Home
            </Link>
            <Link href="/generator" className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">
              PLC Generator
            </Link>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            {/* Coming Soon Features - Grayed Out */}
            <div className="flex items-center gap-4">
              {COMING_SOON_FEATURES.slice(0, 2).map((feature) => (
                <div
                  key={feature.name}
                  className="relative flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed opacity-60"
                  title={`${feature.name} - Coming Soon`}
                >
                  <span className="material-icons text-sm">{feature.icon}</span>
                  <span className="text-xs font-medium">{feature.name}</span>
                  <span className="absolute -top-2 -right-2 text-[8px] bg-amber-400 text-amber-900 px-1 rounded font-bold">
                    SOON
                  </span>
                </div>
              ))}
            </div>

            <ThemeToggle />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex flex-col gap-1"
          >
            <span className={`w-6 h-0.5 bg-gray-700 transition-all ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`w-6 h-0.5 bg-gray-700 transition-all ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`w-6 h-0.5 bg-gray-700 transition-all ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-col gap-4">
              {/* Active Links */}
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 font-medium dark:text-gray-300 dark:hover:text-blue-400"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/generator"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg font-semibold text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                PLC Generator
              </Link>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Coming Soon</p>

              {/* Coming Soon Features - Grayed Out */}
              {COMING_SOON_FEATURES.map((feature) => (
                <div
                  key={feature.name}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed opacity-60"
                >
                  <span className="material-icons text-sm">{feature.icon}</span>
                  <span className="text-sm font-medium">{feature.name}</span>
                  <span className="ml-auto text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                    COMING SOON
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
