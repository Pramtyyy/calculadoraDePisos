import org.gradle.api.tasks.Copy

plugins {
    id("com.android.application")
}

android {
    namespace = "br.com.calculadordepisos"
    compileSdk = 37

    defaultConfig {
        applicationId = "br.com.calculadordepisos"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

}

val syncWebAssets by tasks.registering(Copy::class) {
    from(rootProject.projectDir.parentFile) {
        include("index.html")
        include("logica.js")
        include("style.css")
    }
    into(layout.projectDirectory.dir("src/main/assets"))
}

tasks.named("preBuild") {
    dependsOn(syncWebAssets)
}
