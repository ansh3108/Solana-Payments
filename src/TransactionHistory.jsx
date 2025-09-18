import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr")

const TransactionHistory = () => {
    const wallet = useWallet();
    const [ transactions, setTransactions ]= useState([]);
    const [ loading, setLoading ]=useState(false)
    const [error, setError]= useState("")
    const connection = new Connection(clusterApiUrl("devnet"))

    const fetchTransactionHistory = async () => {
        if(!wallet.connected || !wallet.publicKey) return;

        setLoading(true)
        setError("")

        try {
            console.log("Fetching transaction history....")

            const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey)
            console.log("Token account: ", tokenAccount.toString());

            const signatures = await connection.getSignaturesForAddress(tokenAccount, {
                limit: 20
            })

            console.log("found ${signatures.length} signatures")

            if(signatures.length===0){
                setTransactions([])
                return
            }

            const txDetails = await connection.getParsedTransactions(
                signatures.map(sig => sig.signature),
                { maxSupportedTransactionVersion: 0 }
            )

            console.log("Processing transaction details....")

            const processedTxs = [];

            for(let i=0; i<txDetails.length; i++){
                const tx=txDetails[i]
                const sig = signatures[i]

                if(!tx || !tx.meta || tx.meta.err) continue;

                const instructions = tx.transaction?.message?.instructions || []

                for (const instruction of instructions) {
                    const info = instruction.parsed?.info;

                    if(info.mint === USDC_MINT.toString() &&
                    (info.source === tokenAccount.toString() || info.destination === tokenAccount.toString())) {
                        const amount = parseFloat(info.amount)/Math.pow(10,6)
                        const isOutgoing = info.source === tokenAccount.toString()

                        processedTxs.push({
                            signature: sig.signature,
                            timestamp: sig.blockTime,
                            type: isOutgoing? 'sent' : 'received',
                            amount: amount,
                            from: info.source,
                            to: info.destination,
                            otherParty: isOutgoing ? info.destination : info.source,
                            status: 'confirmed',
                            slot: sig.slot
                        })
                        
                        break;
                    }
                }
            

                const preBalances = tx.meta.preTokenBalances || [];
                const postBalances= tx.meta.postTokenBalances || [];

                for(const preBalance of preBalances) {
                    if(preBalance.mint === USDC_MINT.toString() && preBalance.owner === wallet.publicKey.toString()){
                        const postBalance = postBalances.find(pb => 
                            pb.accountIndex === preBalance.accountIndex
                        )

                        if(postBalance){
                            const preAmount = parseFloat(preBalance.uiTokenAmount.amount)/ Math.pow(10,6)
                            const postAmount = parseFloat(postBalance.uiTokenAmount.amount)/Math.pow(10, 6)
                            const diff = postAmount - preAmount;

                            if(Math.abs(diff) > 0){
                                processedTxs.push({
                                    signature: sig.signature,
                                    timestamp: sig.blockTime,
                                    type: diff>0 ? 'received' : 'sent',
                                    amount: Math.abs(diff),
                                    from: 'unknown',
                                    to: 'unknown',
                                    otherParty: 'Unknown',
                                    status: 'confirmed',
                                    slot: sig.slot
                                });
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

        console.log(`Processed ${processedTxs.length} USDC transactions`)
        setTransactions(processedTxs)
        
    } catch (err) {
        console.error("Error fetching transaction history: ",err)
        setError("Failed to load transaction history")
    } finally {
        setLoading(false)
    }
}

useEffect(() => {
    if(wallet.connected && wallet.publicKey) {
        fetchTransactionHistory()
    } else {
        setTransactions([]);
    }
}, [wallet.connected, wallet.publicKey])

const formatAddress = (address) => {
    if(!address || address === 'unknown') return 'Unknown';

    return `${address.slice(0,4)}...${address.slice(-4)}`;

}

const formatDate = (timestamp) => {
    if(!timestamp) return 'Unknown time'
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

if(!wallet.connected) {
    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="text-center py-8">
                <p className="text-gray-600">Connect your wallet to view transaction history</p>
            </div>
        </div>
    );
}


  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Transaction History
          </h2>
          <button
            onClick={fetchTransactionHistory}
            disabled={loading}
            className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading && transactions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            <p>{error}</p>
            <button 
              onClick={fetchTransactionHistory}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No USDC transactions found</p>
            <p className="text-sm mt-1">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx, index) => (
              <div key={tx.signature} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === 'sent' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {tx.type === 'sent' ? '↗' : '↙'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {tx.type}
                        </span>
                        <span className="text-sm text-gray-500">
                          {tx.type === 'sent' ? 'to' : 'from'} {formatAddress(tx.otherParty)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(tx.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-semibold ${
                      tx.type === 'sent' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {tx.type === 'sent' ? '-' : '+'}${tx.amount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {tx.amount.toFixed(6)} USDC
                    </div>
                  </div>
                </div>
                
                {/* Explorer link */}
                <div className="mt-2 flex justify-end">
                  <a
                    href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors underline"
                  >
                    View on Explorer
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

export default TransactionHistory;