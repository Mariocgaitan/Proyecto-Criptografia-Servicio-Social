import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

export const Component = ({ qrCodeData, otpCode, onOtpChange }) => {
  const stepsData = qrCodeData
    ? [
        {
          title: "Aplicación móvil",
          description: "Descarga una aplicación como Google Authenticator.",
        },
        {
          title: "Escanear código QR",
          description: "Escanea este código QR con tu aplicación para generar un código.",
          content: (
            <div className="inline-block p-2 border border-white/20 rounded-2xl bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <img
                src={qrCodeData}
                alt="Código QR"
                className="w-28 h-28"
              />
            </div>
          ),
        },
        {
          title: "Ingresar código",
          description: "Ingresa el código de 6 dígitos proporcionado por la aplicación.",
          content: (
            <InputOTP maxLength={6} value={otpCode} onChange={onOtpChange} autoFocus>
              <InputOTPGroup className="gap-2">
                {[...Array(6)].map((_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="border border-white/30 rounded-lg bg-black/40 text-white text-lg font-normal h-10 w-9 sm:h-12 sm:w-10 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          ),
        },
      ]
    : [
        {
          title: "Ingresar código",
          description: "Ingresa el código de 6 dígitos proporcionado por tu aplicación de autenticación para continuar.",
          content: (
            <div className="flex justify-center w-full">
              <InputOTP maxLength={6} value={otpCode} onChange={onOtpChange} autoFocus>
                <InputOTPGroup className="gap-2 sm:gap-3">
                  {[...Array(6)].map((_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="border border-white/30 rounded-xl bg-black/20 text-white text-xl sm:text-2xl font-normal h-14 w-12 sm:h-16 sm:w-14 focus-visible:ring-blue-400 focus-visible:border-blue-400 shadow-inner"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          ),
        },
      ];

  const hasMultipleSteps = stepsData.length > 1;

  return (
    <Card
      className="flex w-[100%] max-w-[460px] flex-col gap-4 p-4 sm:p-5 md:p-6 bg-black/40 border-white/10 backdrop-blur-md shadow-2xl text-white rounded-[2rem]">
      <CardHeader className="flex flex-col items-center gap-1 p-0">
        <div className="flex flex-col space-y-1 text-center">
          <CardTitle className="text-2xl sm:text-[26px] font-normal tracking-tight text-white mb-0">
            Verificación en 2 pasos
          </CardTitle>
          {qrCodeData && (
            <CardDescription className="tracking-[-0.006em] text-white/70 text-xs sm:text-sm">
              Protege tu cuenta con una capa de seguridad adicional.
            </CardDescription>
          )}
        </div>
      </CardHeader>

      <Separator className="bg-white/10" />

      <CardContent className="p-0">
        <div className="grid items-start justify-start grid-cols-1 w-full">
          {stepsData.map((step, index) => {
            return (
              <div
                key={index}
                className={cn(
                  "relative flex flex-row items-start before:absolute before:start-0 gap-3 last:after:hidden w-full",
                  hasMultipleSteps && "after:absolute after:top-8 after:bottom-1 after:start-[13px] after:w-px after:-translate-x-[0.5px] after:bg-white/20",
                  index !== stepsData.length - 1 && "pb-3 sm:pb-4"
                )}>
                {hasMultipleSteps && (
                  <div className="flex flex-col items-center self-stretch pt-0.5">
                    <span
                      className="z-10 text-[10px] font-normal flex shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/20 text-white size-6 backdrop-blur-sm">
                      {index + 1}
                    </span>
                  </div>
                )}
                
                <div className={cn("flex flex-col pt-0.5 w-full", hasMultipleSteps ? "items-start" : "items-center text-center")}>
                  {hasMultipleSteps && (
                    <p className="text-sm leading-none font-normal text-white">
                      {step.title}
                    </p>
                  )}
                  <p className={cn("leading-snug text-white/60 mb-1.5", hasMultipleSteps ? "text-xs sm:text-sm mt-1" : "text-sm sm:text-base mt-2 mb-6 max-w-[320px]")}>
                    {step.description}
                  </p>
                  {step.content && <div className="mt-1 w-full">{step.content}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
