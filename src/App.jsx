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
    const [balanceLoading, setBalanceLoading]= useState(null);
    const [balanceError, setBalanceError]= useState("");

    const connection = new Connection(clusterApiUrl("devnet"));
    
    useEffect(() => {
        const fetchBalance = async() => {
            if(!wallet.connected || !wallet.publicKey){
                setUsdcBalance(null)
                setBalanceError("")
                return;
            }

            setBalanceLoading(true);
            setBalanceError("")
            console.log("Fetching USDC balance for: ", wallet.publicKey.toString())

            try {
                const mintInfo= await getMint(connection, USDC_MINT)
                setDecimals(mintInfo.decimals)
                console.log("Mint info loaded, decimals: ",mintInfo.decimals)

                const ata= await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
                console.log("ATA address: ", ata.toString())

                try{
                    const accountInfo = await getAccount(connection, ata)
                    const balance = Number(accountInfo.amount)/ Math.pow(10, mintInfo.decimals)
                    setUsdcBalance(balance)
                    console.log("Balance loaded: ", balance, "USDC")
                } catch(accountErr){
                    console.log("Token account not found, balance= 0")
                    setUsdcBalance(0)
                }
            } catch(err){
                console.error("Error fetching balance: ", err);
                setBalanceError("Failed to load balance");
                setUsdcBalance(null)
            } finally{
                setBalanceLoading(false)
            }
        }
        fetchBalance();
    }, [wallet.connected, wallet.publicKey, connection])

    const refreshBalance = async () => {
        if(!wallet.connected || !wallet.publicKey) return

        setBalanceLoading(true)
        setBalanceError("")

        try {
            const mintInfo = await getMint(connection, USDC_MINT)
            const ata= await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);

            try{
                const accountInfo = await getAccount(connection, ata)
                const balance = Number(accountInfo.amount)/ Math.pow(10, mintInfo.decimals)
                setUsdcBalance(balance)
            } catch {
                setUsdcBalance(0)
            }
        } catch(err){
            setBalanceError("Failed to refresh balance")
        } finally{
            setBalanceLoading(false)
        }
    }


    const handleSend = async () => {
        setIsSending(true)
        setError("")
        setTxSig(null)

        try{
            if(!recipient.trim()){
                throw new Error("Please enter a recipient address")
            }
            if(!sendAmount || Number(sendAmount) <= 0){
                throw new Error("Please enter a valid amount")
            }

            let recipientPubKey;
            try{
                recipientPubKey = new PublicKey(recipient)
            } catch {
                throw new Error("Invalid recipient address");
            }

            const transaction = new Transaction()
            const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey)
            const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, recipientPubKey)

            try{
                await getAccount(connection, toTokenAccount)
            } catch{
                console.log("Creating recipient token account...")
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        toTokenAccount,
                        recipientPubKey,
                        USDC_MINT
                    )
                )
            }

            const transferIx= createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                wallet.publicKey,
                Number(sendAmount)*Math.pow(10,decimals)
            )
            transaction.add(transferIx)

            const signature= await wallet.sendTransaction(transaction, connection)
            await connection.confirmTransaction(
                { signature, ...(await connection.getLatestBlockhash())},
                "confirmed"
            )

            setTxSig(signature)
            console.log("Transaction succcessful:", signature);

            setTimeout(refreshBalance, 1000)
        } catch(err){
            console.error(err)
            setError(err.message || "Transaction failed!")
        } finally{
            setIsSending(false)
        }
    }

    const generateQR = () => {
        if(!wallet.connected) return alert("Connect wallet first")
        if(!requestAmount) return alert("Enter amount to request");
        
        const value = `solana:${wallet.publicKey.toBase58()}?amount=${requestAmount}&spl-token=${USDC_MINT.toBase58()}`
        setQrValue(value);
    }

    return(
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4 space-y-6">
            <WalletMultiButton className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" />

            {wallet.connected && (
                <div className="bg-white p-4 rounded-lg shadow-md border w-full max-w-md text-center">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">USDC Balance</h3>
                        <button
                            onClick={refreshBalance}
                            disabled={balanceLoading}
                            className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
                        >
                            {balanceLoading ? "Refreshing...." : "Refresh"}
                        </button>
                    </div>

                    {balanceLoading ? (
                        <p className="text-gray-600">Loading...</p>
                    ) : balanceError ? (
                        <p className="text-red-600 text-sm">{balanceError}</p>
                    ) : (
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {usdcBalance !== null ? `$${usdcBalance.toFixed(2)}`: `--`}
                            </p>
                            <p className="text-sm text-gray-500">
                                {usdcBalance !== null ? `${usdcBalance} USDC`:'Balance unavailable'}
                            </p>
                        </div>
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
                            className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            disabled={isSending || !wallet.connected}
                        >
                            {isSending ? "Sending...":"Send USDC"}
                        </button>

                        {txSig && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-700 font-semibold">Tranasction Successful!</p>
                                <p className="text-xs text-green-600 mt-1 break-all">
                                    <a
                                        href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:no-underline"
                                    >
                                        View on Solana Explorer
                                    </a>
                                </p>
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
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
                            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            disabled={!wallet.connected}
                        >
                            Generate QR
                        </button>

                        {qrValue && (
                            <div className="bg-white p-4 rounded-lg shadow-md border">
                                <QRCode value={qrValue} size={200} />
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    Request: ${requestAmount} USDC
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}