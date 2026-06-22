package com.thdpv.movietheater.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.movie.entity.Country;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.repository.CountryRepository;
import com.thdpv.movietheater.movie.repository.GenreRepository;

/**
 * Seeds reference catalogs (genres, countries) used by movie filters on the public site.
 * Idempotent: only inserts records that do not already exist.
 */
@Component
public class ReferenceMetadataSeeder {

    private static final Logger logger = LoggerFactory.getLogger(ReferenceMetadataSeeder.class);

    private static final String[] GENRES = {
            "Hành động",
            "Phiêu lưu",
            "Hoạt hình",
            "Hài",
            "Kinh dị",
            "Tình cảm",
            "Lãng mạn",
            "Viễn tưởng",
            "Khoa học viễn tưởng",
            "Kịch tính",
            "Gay cấn",
            "Bí ẩn",
            "Tội phạm",
            "Hình sự",
            "Chiến tranh",
            "Lịch sử",
            "Tiểu sử",
            "Gia đình",
            "Tài liệu",
            "Âm nhạc",
            "Nhạc kịch",
            "Thể thao",
            "Võ thuật",
            "Giả tưởng",
            "Thần thoại",
            "Siêu anh hùng",
            "Tâm lý",
            "Cao bồi",
            "Phiêu lưu viễn tưởng",
            "Khoa học",
            "Trẻ em",
            "Chính kịch"
    };

    /** ISO 3166-1 alpha-2 code + Vietnamese display name */
    private static final String[][] COUNTRIES = {
            { "VN", "Việt Nam" },
            { "US", "Mỹ" },
            { "KR", "Hàn Quốc" },
            { "JP", "Nhật Bản" },
            { "CN", "Trung Quốc" },
            { "TW", "Đài Loan" },
            { "HK", "Hồng Kông" },
            { "TH", "Thái Lan" },
            { "PH", "Philippines" },
            { "ID", "Indonesia" },
            { "MY", "Malaysia" },
            { "SG", "Singapore" },
            { "IN", "Ấn Độ" },
            { "GB", "Anh" },
            { "FR", "Pháp" },
            { "DE", "Đức" },
            { "IT", "Ý" },
            { "ES", "Tây Ban Nha" },
            { "PT", "Bồ Đào Nha" },
            { "NL", "Hà Lan" },
            { "BE", "Bỉ" },
            { "CH", "Thụy Sĩ" },
            { "SE", "Thụy Điển" },
            { "NO", "Na Uy" },
            { "DK", "Đan Mạch" },
            { "PL", "Ba Lan" },
            { "RU", "Nga" },
            { "TR", "Thổ Nhĩ Kỳ" },
            { "CA", "Canada" },
            { "MX", "Mexico" },
            { "BR", "Brazil" },
            { "AR", "Argentina" },
            { "CL", "Chile" },
            { "CO", "Colombia" },
            { "AU", "Úc" },
            { "NZ", "New Zealand" },
            { "IE", "Ireland" },
            { "IL", "Israel" },
            { "AE", "Các Tiểu vương quốc Ả Rập Thống nhất" },
            { "SA", "Ả Rập Saudi" },
            { "EG", "Ai Cập" },
            { "ZA", "Nam Phi" },
            { "NG", "Nigeria" },
            { "IR", "Iran" },
            { "PK", "Pakistan" },
            { "BD", "Bangladesh" },
            { "KZ", "Kazakhstan" },
            { "UA", "Ukraine" },
            { "CZ", "Séc" },
            { "AT", "Áo" },
            { "FI", "Phần Lan" },
            { "GR", "Hy Lạp" },
            { "HU", "Hungary" },
            { "RO", "Romania" },
            { "SK", "Slovakia" },
            { "HR", "Croatia" },
            { "RS", "Serbia" },
            { "LU", "Luxembourg" },
            { "IS", "Iceland" },
            { "MM", "Myanmar" },
            { "KH", "Campuchia" },
            { "LA", "Lào" }
    };

    private final GenreRepository genreRepository;
    private final CountryRepository countryRepository;

    public ReferenceMetadataSeeder(GenreRepository genreRepository, CountryRepository countryRepository) {
        this.genreRepository = genreRepository;
        this.countryRepository = countryRepository;
    }

    public void seedAll() {
        seedGenres();
        seedCountries();
    }

    private void seedGenres() {
        int created = 0;
        for (String name : GENRES) {
            if (!genreRepository.existsByNameIgnoreCase(name)) {
                Genre genre = new Genre();
                genre.setName(name);
                genreRepository.save(genre);
                created++;
            }
        }
        logger.info("Genre catalog ready ({} new genres seeded).", created);
    }

    private void seedCountries() {
        int created = 0;
        for (String[] countryData : COUNTRIES) {
            String code = countryData[0];
            String name = countryData[1];
            if (!countryRepository.existsByCodeIgnoreCase(code)) {
                Country country = new Country();
                country.setCode(code);
                country.setName(name);
                countryRepository.save(country);
                created++;
            }
        }
        logger.info("Country catalog ready ({} new countries seeded).", created);
    }
}
