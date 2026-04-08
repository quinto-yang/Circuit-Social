import { SiweMessage } from "siwe";

export function buildSiweMessage(input: {
  address: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  statement: string;
}) {
  const message = new SiweMessage({
    domain: window.location.host,
    address: input.address,
    statement: input.statement,
    uri: window.location.origin,
    version: "1",
    chainId: input.chainId,
    nonce: input.nonce,
    issuedAt: input.issuedAt
  });

  return message.prepareMessage();
}
