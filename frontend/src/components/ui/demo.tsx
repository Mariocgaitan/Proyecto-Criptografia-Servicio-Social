import ProgressIndicator from "@/components/ui/progress-indicator";
import CounterLoading from "@/components/ui/counter-loader";

export function ProgressIndicatorDemo() {
  return <ProgressIndicator />;
}

export function DemoOne() {
  return <CounterLoading seconds={12} />;
}

export default DemoOne;
