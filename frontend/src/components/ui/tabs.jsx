"use client";;
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName
}) => {
  const [active, setActive] = useState(propTabs[0]);
  const [tabs, setTabs] = useState(propTabs);

  // Keep internal state in sync with prop changes (e.g. QR timer updates)
  useEffect(() => {
    setTabs(prev => {
      // Preserve the current order but update content
      const currentOrder = prev.map(t => t.value);
      const updated = currentOrder.map(val =>
        propTabs.find(pt => pt.value === val) || prev.find(t => t.value === val)
      ).filter(Boolean);
      return updated;
    });
    setActive(prev => propTabs.find(pt => pt.value === prev.value) || propTabs[0]);
  }, [propTabs]);

  const moveSelectedTabToTop = (idx) => {
    const newTabs = [...propTabs];
    const selectedTab = newTabs.splice(idx, 1);
    newTabs.unshift(selectedTab[0]);
    setTabs(newTabs);
    setActive(newTabs[0]);
  };

  const [hovering, setHovering] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full",
          containerClassName
        )}>
        {propTabs.map((tab, idx) => (
          <button
            key={tab.title}
            onClick={() => {
              moveSelectedTabToTop(idx);
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={cn("relative px-4 py-2 rounded-full", tabClassName)}
            style={{
              transformStyle: "preserve-3d",
            }}>
            {active.value === tab.value && (
              <motion.div
                layoutId="clickedbutton"
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className={cn(
                  "absolute inset-0 bg-gray-200 dark:bg-zinc-800 rounded-full ",
                  activeTabClassName
                )} />
            )}

            <span className="relative block text-black dark:text-white">
              {tab.title}
            </span>
          </button>
        ))}
      </div>
      <FadeInDiv
        tabs={tabs}
        active={active}
        key={active.value}
        hovering={hovering}
        className={cn("mt-6", contentClassName)} />
    </>
  );
};

export const FadeInDiv = ({
  className,
  tabs,
}) => {
  const isActive = (tab) => {
    return tab.value === tabs[0].value;
  };
  return (
    <div className="relative w-full">
      {tabs.map((tab) => (
        <motion.div
          key={tab.value}
          layoutId={tab.value}
          style={{
            zIndex: isActive(tab) ? 1 : 0,
            opacity: isActive(tab) ? 1 : 0,
          }}
          animate={{
            y: isActive(tab) ? [0, 40, 0] : 0,
          }}
          className={cn(
            "w-full",
            isActive(tab) ? "relative" : "absolute top-0 left-0 pointer-events-none",
            className
          )}>
          {tab.content}
        </motion.div>
      ))}
    </div>
  );
};
