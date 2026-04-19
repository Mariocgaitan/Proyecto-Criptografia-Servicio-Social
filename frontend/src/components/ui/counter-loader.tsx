"use client";

import React from "react";
import styled from "styled-components";

type CounterLoadingProps = {
  seconds?: number;
  urgent?: boolean;
};

const CounterLoading = ({ seconds = 0, urgent = false }: CounterLoadingProps) => {
  const TimerBlocks = () => (
    <div className="timer" aria-hidden="true">
      <div className="div1" />
      <div className="div2" />
      <div className="div3" />
      <div className="div4" />
      <div className="div5" />
      <div className="div6" />
      <div className="div7" />
      <div className="div8" />
      <div className="div9" />
      <div className="div10" />
      <div className="div11" />
      <div className="div12" />
      <div className="div13" />
      <div className="div14" />
      <div className="div15" />
    </div>
  );

  return (
    <StyledWrapper $urgent={urgent}>
      <div className="counter-head">{String(Math.max(seconds, 0)).padStart(2, "0")}s</div>
      <div className="timers-wrap">
        <TimerBlocks />
        <TimerBlocks />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div<{ $urgent: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.7rem 0.95rem;
  border-radius: 0.85rem;
  background: ${({ $urgent }) => ($urgent ? "rgba(239, 68, 68, 0.18)" : "rgba(255, 255, 255, 0.07)")};
  border: 1px solid ${({ $urgent }) => ($urgent ? "rgba(248, 113, 113, 0.6)" : "rgba(96, 165, 250, 0.35)")};
  box-shadow: ${({ $urgent }) => ($urgent ? "0 10px 25px rgba(239,68,68,0.25)" : "0 10px 25px rgba(37,99,235,0.18)")};

  .counter-head {
    color: ${({ $urgent }) => ($urgent ? "#fee2e2" : "#dbeafe")};
    font-size: 0.73rem;
    letter-spacing: 0.22em;
    font-weight: 600;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
  }

  .timers-wrap {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .timer {
    display: grid;
    grid-template-columns: repeat(3, 12px);
    grid-template-rows: repeat(5, 12px);
    gap: 5px;
    grid-template-areas:
      "div1 div2 div3"
      "div4 div5 div6"
      "div7 div8 div9"
      "div10 div11 div12"
      "div13 div14 div15";
  }

  .timer > div {
    background-color: ${({ $urgent }) => ($urgent ? "#fca5a5" : "#7dd3fc")};
    border-radius: 3px;
  }

  .div1 {
    grid-area: div1;
    animation: div1 10s both infinite;
  }

  .div2 {
    grid-area: div2;
    animation: div2 10s both infinite;
  }

  .div3 {
    grid-area: div3;
  }

  .div4 {
    grid-area: div4;
    animation: div4 10s both infinite;
  }

  .div5 {
    grid-area: div5;
    display: none;
  }

  .div6 {
    grid-area: div6;
    animation: div6 10s both infinite;
  }

  .div7 {
    grid-area: div7;
    animation: div7 10s both infinite;
  }

  .div8 {
    grid-area: div8;
    animation: div8 10s both infinite;
  }

  .div9 {
    grid-area: div9;
  }

  .div10 {
    grid-area: div10;
    animation: div10 10s both infinite;
  }

  .div11 {
    grid-area: div11;
    display: none;
  }

  .div12 {
    grid-area: div12;
    animation: div12 10s both infinite;
  }

  .div13 {
    grid-area: div13;
    animation: div13 10s both infinite;
  }

  .div14 {
    grid-area: div14;
    animation: div14 10s both infinite;
  }

  .div15 {
    grid-area: div15;
  }

  @keyframes div1 {
    0% {
      transform: translateX(0);
    }

    10% {
      transform: translateX(34px);
    }

    20%,
    100% {
      transform: translateX(0);
    }
  }

  @keyframes div2 {
    0% {
      transform: translateX(0);
    }

    10% {
      transform: translateX(17px);
    }

    20% {
      transform: translateX(0);
    }

    40% {
      transform: translateX(17px);
    }

    50%,
    100% {
      transform: translateX(0);
    }
  }

  @keyframes div4 {
    0% {
      transform: translateX(0);
    }

    10%,
    30% {
      transform: translateX(34px);
    }

    40%,
    60% {
      transform: translateX(0);
    }

    70% {
      transform: translateX(34px);
    }

    80%,
    100% {
      transform: translateX(0);
    }
  }

  @keyframes div6 {
    0%,
    40% {
      transform: translateX(0);
    }

    50%,
    60% {
      transform: translateX(-34px);
    }

    70%,
    100% {
      transform: translateX(0);
    }
  }

  @keyframes div7 {
    0% {
      transform: translateX(0);
    }

    10% {
      transform: translateX(34px);
    }

    20%,
    60% {
      transform: translateX(0);
    }

    70% {
      transform: translateX(34px);
    }

    80%,
    100% {
      transform: translateX(0);
    }
  }

  @keyframes div8 {
    0%,
    10% {
      transform: translateX(17px);
    }

    20%,
    60% {
      transform: translateX(0);
    }

    70% {
      transform: translateX(17px);
    }

    80%,
    90% {
      transform: translateX(0);
    }

    100% {
      transform: translateX(17px);
    }
  }

  @keyframes div10 {
    0% {
      transform: translateX(0);
    }

    10% {
      transform: translateX(34px);
    }

    20% {
      transform: translateX(0);
    }

    30%,
    50% {
      transform: translateX(34px);
    }

    60% {
      transform: translateX(0);
    }

    70% {
      transform: translateX(34px);
    }

    80% {
      transform: translateX(0);
    }

    90% {
      transform: translateX(34px);
    }

    100% {
      transform: translateX(0);
    }
  }

  @keyframes div12 {
    0%,
    10% {
      transform: translateX(0);
    }

    20% {
      transform: translateX(-34px);
    }

    30%,
    100% {
      transform: translateX(0);
    }
  }

  @keyframes div13 {
    0% {
      transform: translateX(0);
    }

    10% {
      transform: translateX(34px);
    }

    20%,
    30% {
      transform: translateX(0);
    }

    40% {
      transform: translateX(34px);
    }

    50%,
    60% {
      transform: translateX(0);
    }

    70% {
      transform: translateX(34px);
    }

    80%,
    100% {
      transform: translateX(0);
    }
  }

  @keyframes div14 {
    0% {
      transform: translateX(0);
    }

    10% {
      transform: translateX(17px);
    }

    20%,
    30% {
      transform: translateX(0);
    }

    40% {
      transform: translateX(17px);
    }

    50%,
    60% {
      transform: translateX(0);
    }

    70% {
      transform: translateX(17px);
    }

    80%,
    100% {
      transform: translateX(0);
    }
  }

`;

export default CounterLoading;
