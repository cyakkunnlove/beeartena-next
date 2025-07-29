#!/bin/bash

# Firebase Admin SDK環境変数設定スクリプト

echo "Setting Firebase Admin SDK environment variables..."

# Firebase Admin Client Email
echo "firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com" | vercel env add FIREBASE_ADMIN_CLIENT_EMAIL production
echo "firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com" | vercel env add FIREBASE_ADMIN_CLIENT_EMAIL preview
echo "firebase-adminsdk-fbsvc@beeart-ena.iam.gserviceaccount.com" | vercel env add FIREBASE_ADMIN_CLIENT_EMAIL development

# Firebase Admin Private Key (エスケープされた形式)
PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCr0E/RAcRsUbTx\ny7lgFNw3sQ22m/NyMAmlnF0LEWpwvO0bAvGa+ecxF9fzKV0AoE+TI607RYFjO/Cm\n1zwbU9ZSNLLUcme1slHpcB5FgfIyM6xUIDWchVpw+JkEW9DHbKCXjIOc38Z3W3FF\n8FZGkQwVJKUqVxNrhxB8M6qPeH3FeWzQIdnqwsf7giz3xQv3HMYja1Xwmpoxkg+9\nniHRMbmh87lsyIeITSF1Z3LJBtqHmDFubBLvkr4wRaIQpgK6U/q8/tExQKgAR0tT\n03lVkm3hz3kUJniOaoL+AoiH8VFIgA2N/Ptqp7qYx5f3Cw3LDs5ClsR3xfA6ijq2\nBxonjx9lAgMBAAECggEABMg1wddm1Zf5mBBHntRoeQwDxHJ3QRVJXh4UcIzXIFUA\nfskNxfaQ2CrgecC2jrWnjqzGcyOhBrd3StbV8gca7ECnaJEtm0mft4ZaxVb+UXuN\nie2NPcfFZ7xiRT7eov+o7Ebpg98uRDSxRKp8OuxpwG3mbfUB/J3EAvJM2+o/3+mQ\nkUQ18JzZzKhsX9dzCv4Wcbjnvp0zWj3/O7AfGBUZPfECpqmbJVGQJ709hEThrLjl\nHo09ftSFe8dbTNDp2MtW0Vy+5WNNer8JFYlyKR/B2QMIYh4ArtPUvlIc0GB7zQ/g\n7SGmUnvzCMD6msrZp+DXAow55EERUDl2ndWl3SYwoQKBgQDyTKVjDaD9IwuElJJQ\nM4N09TKsbyqmP72vWNtDSMs4wNPnf1oErCxK4yi7D30uoiPKBwGy9RPHHVyJLiOR\nwh9fHWOJmGpMnI4++IXokpuDT8JginwL57vuaq+Sd2F2uGrlAld/KwXrzfN9+OO8\nCNHvFOUOgetnmt2/4y91lgqmBQKBgQC1h113TER1RPEgjisW1RaqUHOQjoI8ypzc\nsH9Y7m1bsbX/v8Kgt5AHnUPW5EB6YA8n6tIwKG7aBvf2cOrhqQ9pnvFVQwkcMU1P\nmEpGVYffaRNeGqtUYjcdJ/gUuEFUVx/WgESSgmvavWaALBluuy+i+Yvlfj01spfW\nHGd60i9x4QKBgHmx7U82xSjetSY9yM7nUJspm+3nV7BwS0EKi/XbVdaHYubem8PF\nBeoG9aoeOW12misaIcxUMz7KjHOJ7OuEaGVJSXkOSDV6XCdcg0UwfVMSeDos0+jW\n1xkEFHKn6xfJwEaNSozgevTYV/dpTlhexbIi+Hi04BsFOWLrJCcW2PpRAoGATqDS\nkFD9uhnho+tQqLQl/CGa3PuNWA2fAkyE7J1hyvzfy2ZhREIeZd3tu4/kid0/01d4\nMZnh4hhwoVNpudMDtQk+mWLO+GI2jYp2aZ60msWluPYuTf+4xa1BXKAu0/xk8wFe\nMmPBmd6+Hjh7z6XOzXXv7bjPhInWEMz+2YlfOaECgYEAjT+EXZaWzjn4TndVEqNs\nV8xdgbO/LBM9HyMdRMAPM1Of3IkU6HfFSvqNGDv6hdGhT58c58MARnVfIgbM/7e0\neV7T/wjnMEATMxkq1wVfzjI91Dw2bU7OY6FtiLDRuIyZ55oCY3X9CAkLR4jIQzvj\nebrfRiozFRhtGa5Vnam0cf8=\n-----END PRIVATE KEY-----'

echo "$PRIVATE_KEY" | vercel env add FIREBASE_ADMIN_PRIVATE_KEY production
echo "$PRIVATE_KEY" | vercel env add FIREBASE_ADMIN_PRIVATE_KEY preview
echo "$PRIVATE_KEY" | vercel env add FIREBASE_ADMIN_PRIVATE_KEY development

echo "Firebase Admin SDK environment variables set successfully!"
echo "Now run: vercel --prod to deploy with new environment variables"