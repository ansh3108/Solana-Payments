module.exports = {
    resolve: {
        fallback: {
            crypto: require.resolve("crypto-broserify"),
            stream: require.resolve("stream-browserify"),
        },
    },
};