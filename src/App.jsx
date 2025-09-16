import { useState } from "react";
import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, clusterApiUrl, Connection } from "@solana/web3.js";
import QRCode from "react-qr-code";
import { createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")

export default function App() {
    const wallet = useWallet();

    const [sendAmount, setSendAmount]= useState("");
    const [recipient, setRecipient]= useState("");
    const [requestAmount, setRequestAmount]= useState("");
    const [qrValue, setQrValue]= useState("");

    const connection = new Connection(clusterApiUrl("mainnet-beta"));

    const handleSend = async () => {
        if(!wallet.connected) return alert("Connect wallet first")
        if(!recipient || !sendAmount) return alert("Enter recipient and amount")

        try {
            const transaction = new Transaction();
            const fromTokenAccount = await getAssociatedTokenAddress(
                USDC_MINT,
                wallet.publicKey
            );
            const toTokenAccount= await getAssociatedTokenAddress(
                USDC_MINT,
                new PublicKey(recipient)
            );
            
            const transferIx = createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                wallet.publicKey,
                Number(sendAmount)*1e6
            )
            transaction.add(transferIx);

            const signature=await wallet.sendTransaction(transaction, connection)

            await connection.confirmTransaction(
                {
                    signature,
                    ...(await connection.getLatestBlockhash()),
                },
                "confirmed"
            )

            alert("transaction sent! Signature: "+signature)
        } catch(err) {
            console.error(err);
            alert("Transaction failed!");
        }
    }

    const generateQR = () => {
        if(!wallet.connected) return alert("Connect wallet first")
        if(!requestAmount) return alert("Enter amount to request");

        const value = `solana:${wallet.publicKey.toBase58()}?amount=${requestAmount}`;
        setQrValue(value);
    }

    return(
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4 space-y-6">
            <WalletMultiButton className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" />
            <div className="flex flex-col space-y-2 w-full max-w-md">
                <input
                    type="text"
                    placeholder="Recipient Public Key"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="p-3 border rounded-lg" 
                />
                <input
                    type="number"
                    placeholder="Amount in USDC"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="p-3 border rounded-lg" 
                />

                <button
                    onClick={handleSend}
                    className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    Send USDC
                </button>
            </div>

            <div className="flex flex-col space-y-2 items-center">
                <input
                    type="number"
                    placeholder="Amount to request in USDC"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    className="p-3 border rounded-lg" 
                />

                <button
                    onClick={generateQR}
                    className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700" 
                >
                    Generate QR
                </button>
                {qrValue && <QRCode value={qrValue} />}
            </div>
        </div>
    )
}