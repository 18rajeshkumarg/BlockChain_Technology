// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract CredentialService {
    struct Credential {
        address holder;
        address issuer;
        uint64 expiresAt;
        bool revoked;
        bool exists;
    }

    address public immutable owner;
    uint256 public verificationFee = 0.001 ether;
    uint256 public totalVerifications;

    mapping(address => bool) public authorizedIssuers;
    mapping(bytes32 => Credential) private credentials;

    event IssuerAuthorizationChanged(address indexed issuer, bool authorized);
    event CredentialIssued(bytes32 indexed credentialHash, address indexed holder, address indexed issuer, uint64 expiresAt);
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed revokedBy);
    event CredentialVerified(bytes32 indexed credentialHash, address indexed verifier, bool valid, uint256 fee, uint256 verifiedAt);
    event VerificationFeeChanged(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
        emit IssuerAuthorizationChanged(msg.sender, true);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    modifier onlyIssuer() {
        require(authorizedIssuers[msg.sender], "Not an authorized issuer.");
        _;
    }

    function setIssuer(address issuer, bool authorized) external onlyOwner {
        require(issuer != address(0), "Invalid issuer address.");
        authorizedIssuers[issuer] = authorized;
        emit IssuerAuthorizationChanged(issuer, authorized);
    }

    function issueCredential(bytes32 credentialHash, address holder, uint64 expiresAt) external onlyIssuer {
        require(credentialHash != bytes32(0), "Credential hash is required.");
        require(holder != address(0), "Invalid holder address.");
        require(!credentials[credentialHash].exists, "Credential already exists.");
        require(expiresAt == 0 || expiresAt > block.timestamp, "Expiration must be in the future.");

        credentials[credentialHash] = Credential(holder, msg.sender, expiresAt, false, true);
        emit CredentialIssued(credentialHash, holder, msg.sender, expiresAt);
    }

    function revokeCredential(bytes32 credentialHash) external {
        Credential storage credential = credentials[credentialHash];
        require(credential.exists, "Credential not found.");
        require(
            msg.sender == owner || msg.sender == credential.issuer || msg.sender == credential.holder,
            "Not authorized to revoke."
        );
        require(!credential.revoked, "Credential already revoked.");

        credential.revoked = true;
        emit CredentialRevoked(credentialHash, msg.sender);
    }

    function setVerificationFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = verificationFee;
        verificationFee = newFee;
        emit VerificationFeeChanged(oldFee, newFee);
    }

    function verifyCredential(bytes32 credentialHash) external payable returns (bool valid) {
        require(msg.value == verificationFee, "Incorrect verification fee.");
        Credential storage credential = credentials[credentialHash];
        valid = credential.exists && !credential.revoked && (credential.expiresAt == 0 || block.timestamp <= credential.expiresAt);

        totalVerifications += 1;
        emit CredentialVerified(credentialHash, msg.sender, valid, msg.value, block.timestamp);
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No fees to withdraw.");

        (bool sent, ) = payable(owner).call{value: amount}("");
        require(sent, "Fee withdrawal failed.");
        emit FeesWithdrawn(owner, amount);
    }
}