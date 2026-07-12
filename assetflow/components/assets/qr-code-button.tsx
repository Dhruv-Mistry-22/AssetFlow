"use client";
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function QrCodeButton({ assetTag, assetName }: { assetTag: string, assetName: string }) {
  const [open, setOpen] = useState(false);
  const [qrSrc, setQrSrc] = useState<string>("");

  useEffect(() => {
    if (open) {
      // Generate QR Code as a Data URL to avoid Canvas mounting bugs in Modals
      QRCode.toDataURL(assetTag, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000', // Black dots
          light: '#ffffff' // White background for high contrast scanning
        }
      })
      .then(url => setQrSrc(url))
      .catch(err => console.error(err));
    } else {
      setQrSrc("");
    }
  }, [open, assetTag]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors" title="Show QR Code">
        <QrCode className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px] glass-card border-white/10 text-center flex flex-col items-center">
        <DialogHeader>
          <DialogTitle className="text-center">Scan Asset</DialogTitle>
        </DialogHeader>
        
        <div className="bg-white p-2 rounded-xl mt-4 inline-block shadow-lg">
          {qrSrc ? (
            <img 
              src={qrSrc} 
              alt={`QR Code for ${assetTag}`} 
              width={200} 
              height={200} 
              className="mx-auto rounded-lg"
            />
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center text-muted-foreground animate-pulse bg-zinc-100 rounded-lg">
              Generating...
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="font-mono text-primary font-bold text-xl">{assetTag}</p>
          <p className="text-sm text-muted-foreground mt-1">{assetName}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
