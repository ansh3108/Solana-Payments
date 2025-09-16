import { useState } from "react";
import React from "react";
import { useWallet, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, SystemProgram, clusterApiUrl, Connection } from "@solana/web3.js";
import QRCode from "react-qr-code";

const USDC_MINT=new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export default function App() {
    const wallet = useWallet();
    const [amount, setAmount] = useState("")
    const [recipient, setRecipient] = useState("");
    const [qrValue, setQrValue]= useState("");

    const connection = new Connection(clusterApiUrl("mainnet-beta"));

    const handleSend= async () => {
        if(!wallet.connected) return alert("Connect wallet first!");
        if(!recipient || !amount) return alert("Enter recipient and amount");

        try {
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new publicKey(recipient),
                    lamports: Number(amount)* 1e9,
                })
            )
            
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature);
            alert("Transaction sent! Signature: "+signature);
        } catch(err) {
            console.error(err);
            alert("Transaction failed!")
        }
    }

    const generateQR = () => {
        if(!wallet.connected) return alert("Connect wallet first");
        const value = `solana:${wallet.publicKey.toBase58()}?amount=${amount}`;
        setQrValue(value);
    }

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4 space-y-6">
            <WalletMultiButton className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <div className="flex flex-col space-y-2 w-full max-w-md">
                    <input 
                        type="text"
                        placeholder="Recipient Public Key"
                        value={recipient}
                        onChange={e => setRecipient(e.target.value)}
                        className="p-3 border rounded-lg"
                    />
                    <input 
                        type="number"
                        placeholder="Amount in SOL"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="p-3 border rounded-lg"
                    />
                    <button onClick={handleSend} className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Send SOL
                    </button>
                </div>

                <div className="flex flex-col space-y-2 items-center">
                    <input
                        type="number"
                        placeholder="Amount to request"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="p-3 border rounded-lg"
                    />
                    <button onClick={generateQR} className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        Generate QR
                    </button>
                    {qrValue && <QRCode value={qrValue} />}
                </div>

            </WalletMultiButton>
        </div>
    )
}