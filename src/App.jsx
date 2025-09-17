import { useEffect, useState } from "react";
import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, clusterApiUrl, Connection } from "@solana/web3.js";
import QRCode from "react-qr-code";
import { createTransferInstruction, getAssociatedTokenAddress, getAccount, getMint, mintTo } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";

const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr")

export default function App() {
    const wallet = useWallet();

    const [sendAmount, setSendAmount]= useState("");
    const [recipient, setRecipient]= useState("");
    const [requestAmount, setRequestAmount]= useState("");
    const [qrValue, setQrValue]= useState("");
    const [usdcBalance, setUsdcBalance]= useState(null);
    const [ decimals, setDecimals]= useState(6);
    const [isSending, setIsSending]= useState(false);
    const [txSig, setTxSig]= useState(null);
    const [error, setError]= useState("");

    const connection = new Connection(clusterApiUrl("devnet"));
    
    useEffect(() => {
    const fetchBalance = async () => {
        if (!wallet.connected) {
            setUsdcBalance(null);
            return;
        }

        let mintInfo;
        try {
            mintInfo = await getMint(connection, USDC_MINT);
            setDecimals(mintInfo.decimals);
        } catch (err) {
            console.error("Failed to get mint info:", err);
            return;
        }

        const ata = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);

        try {
            const accountInfo = await getAccount(connection, ata);
            setUsdcBalance(Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals));
        } catch (err) {
            console.log("ATA not found, creating...");
            const transaction = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey, 
                    ata,               
                    wallet.publicKey, 
                    USDC_MINT
                )
            );
            const signature = await wallet.sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed");
            setUsdcBalance(0); 
        }
    };

    fetchBalance();
}, [wallet, connection]);

    const handleSend = async () => {
        setIsSending(true)
        setError("")
        setTxSig(null)

        try {
            const transaction = new Transaction();
            const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
            const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(recipient));

            const transferIx = createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                wallet.publicKey,
                Number(sendAmount) * Math.pow(10, decimals)
            )
            transaction.add(transferIx)

            const signature = await wallet.sendTransaction(transaction, connection)
            await connection.confirmTransaction(
                { signature, ...(await connection.getLatestBlockhash())},
                "confirmed"
            )

            setTxSig(signature)
            alert("Transaction sent! Signature: "+ signature)
        } catch(err) {
            console.error(err)
            setError(err.message || "Transaction failed!")
        } finally {
            setIsSending(false);
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

            {wallet.connected && (
                <p className="text-lg font-semibold text-gray-700">
                    USDC Balance: {usdcBalance !== null ? usdcBalance : "Loading..."}
                </p>
            )}

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
                    disabled={isSending}
                >
                    {isSending ? "Sending..." : "Send USDC"}
                </button>

                {txSig && (
                    <p className="text-sm text-green-700 mt-2">
                        Transaction Signature: {txSig}
                    </p>
                )}
                {error && (
                    <p className="text-sm text-red-600 mt-2">
                        Error: {error}
                    </p>
                )}
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