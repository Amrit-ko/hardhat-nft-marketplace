// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

error NftMarketplaceWithERC20Tokens__PriceMustBeAboveZero();
error NftMarketplaceWithERC20Tokens__NotApprovedForMarketplace();
error NftMarketplaceWithERC20Tokens__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplaceWithERC20Tokens__NotOwner();
error NftMarketplaceWithERC20Tokens__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplaceWithERC20Tokens__PriceNotMet(
    address nftAddress,
    uint256 tokenId,
    uint256 price
);
error NftMarketplaceWithERC20Tokens__NoProceeds();
error NftMarketplaceWithERC20Tokens__TransferFailed();

contract NftMarketplaceWithERC20Tokens is ReentrancyGuard {
    struct Listing {
        uint256 price;
        address seller;
        uint256 id;
        bool acceptsERC20Tokens;
    }
    struct TokensPay {
        address[] tokenAddresses;
        address[] priceFeedAddresses;
    }

    uint256 public s_counter;
    mapping(uint256 => TokensPay) private s_tokensPayInfo;
    mapping(address => mapping(uint256 => Listing)) private s_listings;
    mapping(address => uint256) private s_proceeds;
    mapping(address => mapping(address => uint256)) public s_ERC20TokenProceeds;

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        uint256 itemId
    );

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemBoughtWithERC20Token(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        address ERC20TokenAddress,
        uint256 paidInERC20Token
    );
    event ItemCanceled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId);
    event ERC20TOkensAdded(
        address nftAddress,
        uint256 tokenId,
        uint256 itemId,
        address[] ERC20TokenAddresses
    );
    //Modifiers

    modifier notListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0)
            revert NftMarketplaceWithERC20Tokens__AlreadyListed(nftAddress, tokenId);
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0)
            revert NftMarketplaceWithERC20Tokens__NotListed(nftAddress, tokenId);
        _;
    }

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (owner != spender) revert NftMarketplaceWithERC20Tokens__NotOwner();
        _;
    }

    //Main functions

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        if (price <= 0) revert NftMarketplaceWithERC20Tokens__PriceMustBeAboveZero();
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this))
            revert NftMarketplaceWithERC20Tokens__NotApprovedForMarketplace();
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender, s_counter, false);
        emit ItemListed(msg.sender, nftAddress, tokenId, price, s_counter);
        s_counter++;
    }

    function addERC20Tokens(
        address nftAddress,
        uint256 tokenId,
        address[] memory ERC20TokenAddresses,
        address[] memory priceFeedsAddresses
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        Listing storage item = s_listings[nftAddress][tokenId];
        s_tokensPayInfo[item.id] = TokensPay(ERC20TokenAddresses, priceFeedsAddresses);
        item.acceptsERC20Tokens = true;
        emit ERC20TOkensAdded(nftAddress, tokenId, item.id, ERC20TokenAddresses);
    }

    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable isListed(nftAddress, tokenId) nonReentrant {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (listedItem.price > msg.value)
            revert NftMarketplaceWithERC20Tokens__PriceNotMet(
                nftAddress,
                tokenId,
                listedItem.price
            );
        s_proceeds[listedItem.seller] += msg.value;
        IERC721 nft = IERC721(nftAddress);
        delete (s_listings[nftAddress][tokenId]);
        nft.safeTransferFrom(listedItem.seller, msg.sender, tokenId);
        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    function buyItemWithERC20Token(
        address nftAddress,
        uint256 tokenId,
        uint256 ERC20TokenId
    ) external isListed(nftAddress, tokenId) nonReentrant {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        TokensPay memory tokenInfo = s_tokensPayInfo[listedItem.id];
        address ERC20TokenAddress = tokenInfo.tokenAddresses[ERC20TokenId];
        address priceFeedAddress = tokenInfo.priceFeedAddresses[ERC20TokenId];
        uint256 ethAmountInToken = priceConverter(priceFeedAddress, listedItem.price);
        bool success = IERC20(ERC20TokenAddress).transferFrom(
            msg.sender,
            address(this),
            ethAmountInToken
        );
        if (!success) revert NftMarketplaceWithERC20Tokens__TransferFailed();
        s_ERC20TokenProceeds[listedItem.seller][ERC20TokenAddress] += ethAmountInToken;
        IERC721 nft = IERC721(nftAddress);
        delete (s_listings[nftAddress][tokenId]);
        nft.safeTransferFrom(listedItem.seller, msg.sender, tokenId);
        emit ItemBoughtWithERC20Token(
            msg.sender,
            nftAddress,
            tokenId,
            listedItem.price,
            ERC20TokenAddress,
            ethAmountInToken
        );
    }

    function cancelListing(
        address nftAddress,
        uint256 tokenId
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        Listing storage listedItem = s_listings[nftAddress][tokenId];
        listedItem.price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice, listedItem.id);
    }

    function withdrawProceeds() external nonReentrant {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) revert NftMarketplaceWithERC20Tokens__NoProceeds();
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) revert NftMarketplaceWithERC20Tokens__TransferFailed();
    }

    function withdrawERC20TokenProceeds(address ERC20TokenAddress) external nonReentrant {
        uint256 proceeds = s_ERC20TokenProceeds[msg.sender][ERC20TokenAddress];
        if (proceeds <= 0) revert NftMarketplaceWithERC20Tokens__NoProceeds();
        s_ERC20TokenProceeds[msg.sender][ERC20TokenAddress] = 0;
        bool success = IERC20(ERC20TokenAddress).transfer(msg.sender, proceeds);
        if (!success) revert NftMarketplaceWithERC20Tokens__TransferFailed();
    }

    //Getter functions

    function priceConverter(
        address priceFeedAddress,
        uint256 amount
    ) internal view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        (, int256 tokenPrice, , , ) = priceFeed.latestRoundData();
        uint256 ethAmountInToken = amount * uint256(tokenPrice);
        return ethAmountInToken;
    }

    function getListing(
        address nftAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getItemsERC20TokensList(
        address nftAddress,
        uint256 tokenId
    ) external view returns (address[] memory) {
        return s_tokensPayInfo[s_listings[nftAddress][tokenId].id].tokenAddresses;
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }

    function getERC20TokenProcceds(
        address seller,
        address tokenAddress
    ) external view returns (uint256) {
        return s_ERC20TokenProceeds[seller][tokenAddress];
    }

    function getRate(address priceFeedAddress) external view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        (, int256 tokenPrice, , , ) = priceFeed.latestRoundData();
        return uint256(tokenPrice);
    }
}
