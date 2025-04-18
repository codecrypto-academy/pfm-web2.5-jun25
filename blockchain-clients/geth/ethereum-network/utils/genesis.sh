#!/bin/bash

# Set environment variables
export CHAIN_ID=7403
export SIGNER_ACCOUNT_ADDRESSES="b8ff17cc5d114a0717f38cbbd09ed83642619c7383204c3dd67ef49df01f7df241e31f99b0344b69321a5d0a94df1bd127401bd9c839a09f14f44968"
export ACCOUNT_WITH_BALANCE="0xb650c765f7E3288deBE8909D89261bD27354811C"
export BALANCE="0xad78ebc5ac6200000"

# Call the genesis.sh script
./create-genesis.sh