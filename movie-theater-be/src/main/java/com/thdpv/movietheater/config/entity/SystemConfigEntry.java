package com.thdpv.movietheater.config.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "system_config")
public class SystemConfigEntry {

    @Id
    @Column(name = "config_key", length = 64)
    private String configKey;

    @Column(name = "config_json", columnDefinition = "TEXT", nullable = false)
    private String configJson;

    public String getConfigKey() {
        return configKey;
    }

    public void setConfigKey(String configKey) {
        this.configKey = configKey;
    }

    public String getConfigJson() {
        return configJson;
    }

    public void setConfigJson(String configJson) {
        this.configJson = configJson;
    }
}
